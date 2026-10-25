//! Small input checks shared by the database functions.

use crate::error::{AppError, AppResult};

/// Trims the text and makes sure it is not empty.
pub fn required(field: &str, value: &str) -> AppResult<String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(AppError::invalid(format!("{field} cannot be empty")));
    }
    Ok(value.to_string())
}

/// Accepts colours like `#4f6bed`.
pub fn color(value: &str) -> AppResult<String> {
    let ok = value.len() == 7
        && value.starts_with('#')
        && value[1..].chars().all(|c| c.is_ascii_hexdigit());
    if ok {
        Ok(value.to_lowercase())
    } else {
        Err(AppError::invalid(format!("Invalid colour: {value}")))
    }
}

/// Accepts real dates in the form `YYYY-MM-DD`.
pub fn date(value: &str) -> AppResult<String> {
    let err = || AppError::invalid(format!("Invalid date: {value}"));
    let parts: Vec<&str> = value.split('-').collect();
    if value.len() != 10 || parts.len() != 3 {
        return Err(err());
    }
    let year: u32 = parts[0].parse().map_err(|_| err())?;
    let month: u32 = parts[1].parse().map_err(|_| err())?;
    let day: u32 = parts[2].parse().map_err(|_| err())?;
    let leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    let days_in_month = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return Err(err()),
    };
    if day == 0 || day > days_in_month {
        return Err(err());
    }
    Ok(value.to_string())
}

pub fn optional_date(value: Option<&str>) -> AppResult<Option<String>> {
    match value.map(str::trim).filter(|v| !v.is_empty()) {
        Some(v) => date(v).map(Some),
        None => Ok(None),
    }
}

/// Accepts times in the form `HH:MM` (24 hours).
pub fn optional_time(value: Option<&str>) -> AppResult<Option<String>> {
    let Some(v) = value.map(str::trim).filter(|v| !v.is_empty()) else {
        return Ok(None);
    };
    let err = || AppError::invalid(format!("Invalid time: {v}"));
    let (h, m) = v.split_once(':').ok_or_else(err)?;
    let (h, m): (u32, u32) = (h.parse().map_err(|_| err())?, m.parse().map_err(|_| err())?);
    if v.len() != 5 || h > 23 || m > 59 {
        return Err(err());
    }
    Ok(Some(v.to_string()))
}

/// Checks that `value` is one of `allowed`.
pub fn one_of(field: &str, value: &str, allowed: &[&str]) -> AppResult<String> {
    if allowed.contains(&value) {
        Ok(value.to_string())
    } else {
        Err(AppError::invalid(format!("Invalid {field}: {value}")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dates() {
        assert!(date("2026-02-28").is_ok());
        assert!(date("2028-02-29").is_ok());
        assert!(date("2026-02-29").is_err());
        assert!(date("2026-13-01").is_err());
        assert!(date("26-1-1").is_err());
        assert_eq!(optional_date(Some("  ")).unwrap(), None);
    }

    #[test]
    fn times_and_colors() {
        assert_eq!(
            optional_time(Some("09:30")).unwrap().as_deref(),
            Some("09:30")
        );
        assert!(optional_time(Some("24:00")).is_err());
        assert!(optional_time(Some("9:30")).is_err());
        assert_eq!(color("#ABCDEF").unwrap(), "#abcdef");
        assert!(color("red").is_err());
    }
}
