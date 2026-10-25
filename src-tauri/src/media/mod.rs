//! File work for media packs: finding files, safe copies, thumbnails, export.
//!
//! Safety rules:
//! - Never overwrite: every new file is created with `create_new`, and name clashes get " (2)", " (3)"…
//! - Every copy is checked: the size on disk must match the original.
//! - Nothing here deletes a user file. Originals can only go to the Recycle Bin (see `trash_files`).

use std::fs::{self, File, OpenOptions};
use std::io::{self, BufWriter};
use std::path::{Path, PathBuf};

use image::codecs::jpeg::JpegEncoder;
use image::{DynamicImage, GenericImageView, Rgb, RgbImage};

use crate::error::{AppError, AppResult};

const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp"];
const VIDEO_EXTENSIONS: &[&str] = &["mp4", "mov"];
pub const THUMBNAIL_SIZE: u32 = 320;

/// `"image"`, `"video"`, or `None` when the file type is not supported.
pub fn kind_of(path: &Path) -> Option<&'static str> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    if IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        Some("image")
    } else if VIDEO_EXTENSIONS.contains(&ext.as_str()) {
        Some("video")
    } else {
        None
    }
}

/// All supported media files in `dir` and its subfolders, sorted by path.
/// Hidden files and symbolic links are skipped.
pub fn collect_media_files(dir: &Path) -> AppResult<Vec<PathBuf>> {
    let mut found = Vec::new();
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        for entry in fs::read_dir(&current)? {
            let entry = entry?;
            let path = entry.path();
            if entry.file_name().to_string_lossy().starts_with('.') {
                continue;
            }
            let file_type = entry.file_type()?;
            if file_type.is_dir() {
                stack.push(path);
            } else if file_type.is_file() && kind_of(&path).is_some() {
                found.push(path);
            }
        }
    }
    found.sort();
    Ok(found)
}

/// Makes a name safe for a Windows, Mac or Linux folder or file name.
pub fn safe_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| {
            if c.is_control() || r#"<>:"/\|?*"#.contains(c) {
                '_'
            } else {
                c
            }
        })
        .collect();
    let cleaned = cleaned.trim().trim_end_matches(['.', ' ']).to_string();
    if cleaned.is_empty() {
        return "Untitled".to_string();
    }
    const RESERVED: &[&str] = &["CON", "PRN", "AUX", "NUL"];
    let stem = cleaned.split('.').next().unwrap_or("").to_uppercase();
    let reserved = RESERVED.contains(&stem.as_str())
        || ((stem.starts_with("COM") || stem.starts_with("LPT"))
            && stem.len() == 4
            && stem.as_bytes()[3].is_ascii_digit());
    if reserved {
        format!("_{cleaned}")
    } else {
        cleaned
    }
}

/// `name`, then `name (2)`, `name (3)`… keeping the file extension at the end.
fn numbered(name: &str, n: u32) -> String {
    if n == 1 {
        return name.to_string();
    }
    match name.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() => format!("{stem} ({n}).{ext}"),
        _ => format!("{name} ({n})"),
    }
}

/// Creates a new folder inside `parent` and never reuses an existing one.
pub fn create_unique_dir(parent: &Path, name: &str) -> AppResult<PathBuf> {
    fs::create_dir_all(parent)?;
    let name = safe_name(name);
    for n in 1..10_000 {
        let candidate = parent.join(numbered(&name, n));
        match fs::create_dir(&candidate) {
            Ok(()) => return Ok(candidate),
            Err(e) if e.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(e.into()),
        }
    }
    Err(AppError::invalid("Too many folders with the same name"))
}

/// Creates a new, empty file in `dir`. If the name is taken, a number is added.
fn create_unique_file(dir: &Path, name: &str) -> io::Result<(File, PathBuf)> {
    let name = safe_name(name);
    for n in 1..10_000 {
        let candidate = dir.join(numbered(&name, n));
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&candidate)
        {
            Ok(file) => return Ok((file, candidate)),
            Err(e) if e.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(e),
        }
    }
    Err(io::Error::other("too many files with the same name"))
}

/// Copies `src` into `dest_dir` without overwriting anything, then checks the copy.
/// Returns the path and size of the new copy. An incomplete copy is removed.
pub fn copy_verified(src: &Path, dest_dir: &Path) -> io::Result<(PathBuf, u64)> {
    let name = src
        .file_name()
        .ok_or_else(|| io::Error::other("source has no file name"))?
        .to_string_lossy()
        .into_owned();
    let mut input = File::open(src)?;
    let expected = input.metadata()?.len();
    let (out, dest) = create_unique_file(dest_dir, &name)?;
    let result = (|| {
        let mut writer = BufWriter::new(out);
        let written = io::copy(&mut input, &mut writer)?;
        let out = writer.into_inner().map_err(|e| e.into_error())?;
        out.sync_all()?;
        let on_disk = fs::metadata(&dest)?.len();
        if written != expected || on_disk != expected {
            return Err(io::Error::other(format!(
                "copy is incomplete ({on_disk} of {expected} bytes)"
            )));
        }
        Ok(on_disk)
    })();
    match result {
        Ok(size) => Ok((dest, size)),
        Err(e) => {
            // Only our own unfinished copy is removed, never the original.
            let _ = fs::remove_file(&dest);
            Err(e)
        }
    }
}

/// One file that was copied into the Library.
#[derive(Debug, Clone)]
pub struct Copied {
    pub original: PathBuf,
    pub file_name: String,
    pub kind: &'static str,
    pub size: u64,
}

/// Copies every file into `dest_dir`. Failures are collected and do not stop the import.
/// `progress(done, total)` is called after each file.
pub fn copy_all(
    files: &[PathBuf],
    dest_dir: &Path,
    mut progress: impl FnMut(usize, usize),
) -> (Vec<Copied>, Vec<String>) {
    let mut copied = Vec::new();
    let mut failed = Vec::new();
    for (index, src) in files.iter().enumerate() {
        match copy_verified(src, dest_dir) {
            Ok((dest, size)) => copied.push(Copied {
                original: src.clone(),
                file_name: dest
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into_owned(),
                kind: kind_of(src).unwrap_or("image"),
                size,
            }),
            Err(e) => failed.push(format!("{}: {e}", src.display())),
        }
        progress(index + 1, files.len());
    }
    (copied, failed)
}

/// Moves files to the Recycle Bin (Windows), Trash (Mac) or trash folder (Linux).
pub fn trash_files(paths: &[PathBuf]) -> AppResult<()> {
    if paths.is_empty() {
        return Ok(());
    }
    trash::delete_all(paths).map_err(|e| AppError::Trash(e.to_string()))
}

/// True when `inner` is `outer` or is inside it.
pub fn is_inside(inner: &Path, outer: &Path) -> bool {
    match (inner.canonicalize(), outer.canonicalize()) {
        (Ok(inner), Ok(outer)) => inner.starts_with(outer),
        _ => false,
    }
}

/// Copies files to `dest_dir` (for example the "Use" photos for a post). Returns the count.
pub fn export(files: &[PathBuf], dest_dir: &Path) -> AppResult<usize> {
    fs::create_dir_all(dest_dir)?;
    let mut count = 0;
    for file in files {
        copy_verified(file, dest_dir)?;
        count += 1;
    }
    Ok(count)
}

/// Makes a small JPEG preview of an image (transparent parts become white).
pub fn make_thumbnail(src: &Path, dest: &Path) -> AppResult<()> {
    let img = image::open(src)?;
    let small = img.thumbnail(THUMBNAIL_SIZE, THUMBNAIL_SIZE);
    let rgb = flatten_on_white(&small);
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent)?;
    }
    // Write to a temporary name first, so a half-written thumbnail is never shown.
    let tmp = dest.with_extension("tmp");
    {
        let mut writer = BufWriter::new(File::create(&tmp)?);
        JpegEncoder::new_with_quality(&mut writer, 80).encode_image(&rgb)?;
    }
    fs::rename(&tmp, dest)?;
    Ok(())
}

fn flatten_on_white(img: &DynamicImage) -> RgbImage {
    let (w, h) = img.dimensions();
    let rgba = img.to_rgba8();
    RgbImage::from_fn(w, h, |x, y| {
        let p = rgba.get_pixel(x, y).0;
        let a = p[3] as u32;
        let mix = |c: u8| ((c as u32 * a + 255 * (255 - a)) / 255) as u8;
        Rgb([mix(p[0]), mix(p[1]), mix(p[2])])
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test data only: tiny generated files, created in temporary folders.
    fn write(path: &Path, bytes: &[u8]) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, bytes).unwrap();
    }

    #[test]
    fn collects_supported_files_recursively() {
        let dir = tempfile::tempdir().unwrap();
        write(&dir.path().join("a.PNG"), b"1");
        write(&dir.path().join("clip.mp4"), b"2");
        write(&dir.path().join("sub/b.jpg"), b"3");
        write(&dir.path().join("notes.txt"), b"x");
        write(&dir.path().join(".hidden.png"), b"x");
        let found = collect_media_files(dir.path()).unwrap();
        let names: Vec<String> = found
            .iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().into_owned())
            .collect();
        assert_eq!(names, vec!["a.PNG", "clip.mp4", "b.jpg"]);
        assert_eq!(kind_of(Path::new("x.MOV")), Some("video"));
    }

    #[test]
    fn copies_without_overwriting() {
        let src = tempfile::tempdir().unwrap();
        let dest = tempfile::tempdir().unwrap();
        write(&src.path().join("one/photo.png"), b"first");
        write(&src.path().join("two/photo.png"), b"second!");
        write(&dest.path().join("photo.png"), b"already here");

        let files = collect_media_files(src.path()).unwrap();
        let mut calls = Vec::new();
        let (copied, failed) = copy_all(&files, dest.path(), |d, t| calls.push((d, t)));

        assert!(failed.is_empty());
        assert_eq!(calls, vec![(1, 2), (2, 2)]);
        let names: Vec<&str> = copied.iter().map(|c| c.file_name.as_str()).collect();
        assert_eq!(names, vec!["photo (2).png", "photo (3).png"]);
        // The file that was already there is untouched, and the originals still exist.
        assert_eq!(
            fs::read(dest.path().join("photo.png")).unwrap(),
            b"already here"
        );
        assert_eq!(
            fs::read(dest.path().join("photo (3).png")).unwrap(),
            b"second!"
        );
        assert!(src.path().join("one/photo.png").exists());
        assert_eq!(copied[1].size, 7);
    }

    #[test]
    fn missing_file_is_reported_not_fatal() {
        let src = tempfile::tempdir().unwrap();
        let dest = tempfile::tempdir().unwrap();
        write(&src.path().join("ok.png"), b"ok");
        let files = vec![src.path().join("gone.png"), src.path().join("ok.png")];
        let (copied, failed) = copy_all(&files, dest.path(), |_, _| {});
        assert_eq!(copied.len(), 1);
        assert_eq!(failed.len(), 1);
        assert!(failed[0].contains("gone.png"));
    }

    #[test]
    fn unique_dirs_and_safe_names() {
        let parent = tempfile::tempdir().unwrap();
        let a = create_unique_dir(parent.path(), "Pack: 1?").unwrap();
        let b = create_unique_dir(parent.path(), "Pack: 1?").unwrap();
        assert_eq!(a.file_name().unwrap(), "Pack_ 1_");
        assert_eq!(b.file_name().unwrap(), "Pack_ 1_ (2)");
        assert_eq!(safe_name("CON"), "_CON");
        assert_eq!(safe_name("com1.txt"), "_com1.txt");
        assert_eq!(safe_name("  ...  "), "Untitled");
        assert_eq!(safe_name("Фото пак"), "Фото пак");
    }

    #[test]
    fn export_copies_and_keeps_existing() {
        let src = tempfile::tempdir().unwrap();
        let dest = tempfile::tempdir().unwrap();
        write(&src.path().join("a.png"), b"a");
        write(&dest.path().join("a.png"), b"old");
        let n = export(&[src.path().join("a.png")], dest.path()).unwrap();
        assert_eq!(n, 1);
        assert_eq!(fs::read(dest.path().join("a.png")).unwrap(), b"old");
        assert_eq!(fs::read(dest.path().join("a (2).png")).unwrap(), b"a");
    }

    #[test]
    fn thumbnail_is_small_jpeg() {
        let dir = tempfile::tempdir().unwrap();
        let src = dir.path().join("big.png");
        image::RgbaImage::from_pixel(1000, 500, image::Rgba([255, 0, 0, 0]))
            .save(&src)
            .unwrap();
        let dest = dir.path().join("thumbs/1.jpg");
        make_thumbnail(&src, &dest).unwrap();
        let thumb = image::open(&dest).unwrap();
        assert_eq!(thumb.dimensions(), (320, 160));
        // Fully transparent pixels become white.
        assert!(thumb.to_rgb8().get_pixel(10, 10).0.iter().all(|&c| c > 240));
    }

    #[test]
    fn is_inside_works() {
        let dir = tempfile::tempdir().unwrap();
        let sub = dir.path().join("sub");
        fs::create_dir(&sub).unwrap();
        assert!(is_inside(&sub, dir.path()));
        assert!(!is_inside(dir.path(), &sub));
    }
}
