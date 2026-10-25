import { useState } from "react";
import { createPost, deletePost, updatePost } from "../../api/posts";
import {
  PLATFORMS,
  POST_STATUSES,
  type Platform,
  type Post,
  type PostInput,
  type PostStatus,
  type Project,
} from "../../api/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorText } from "../../components/ErrorText";
import { Modal } from "../../components/Modal";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";

interface PostDialogProps {
  post?: Post;
  initialDate?: string | null;
  projects: Project[];
  onClose: () => void;
}

export function PostDialog({ post, initialDate = null, projects, onClose }: PostDialogProps) {
  const [form, setForm] = useState<PostInput>({
    projectId: post?.projectId ?? null,
    title: post?.title ?? "",
    platform: post?.platform ?? "instagram",
    status: post?.status ?? (initialDate ? "draft" : "idea"),
    date: post?.date ?? initialDate,
    time: post?.time ?? null,
    caption: post?.caption ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof PostInput>(key: K, value: PostInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      // A time without a date makes no sense, so it is dropped.
      const input = { ...form, time: form.date ? form.time : null };
      if (post) await updatePost(post.id, input);
      else await createPost(input);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        title={post ? t.calendar.dialogEdit : t.calendar.dialogNew}
        onClose={onClose}
        footer={
          <>
            {post && (
              <button className="button danger left" onClick={() => setConfirmDelete(true)}>
                {t.common.delete}
              </button>
            )}
            <button className="button" onClick={onClose}>
              {t.common.cancel}
            </button>
            <button className="button primary" onClick={save} disabled={busy || !form.title.trim()}>
              {post ? t.common.save : t.common.create}
            </button>
          </>
        }
      >
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="field">
            {t.calendar.postTitle}
            <input
              type="text"
              value={form.title}
              placeholder={t.calendar.postTitlePlaceholder}
              onChange={(e) => set("title", e.target.value)}
            />
          </label>
          <div className="field-row">
            <label className="field">
              {t.calendar.platform}
              <select
                value={form.platform}
                onChange={(e) => set("platform", e.target.value as Platform)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {t.calendar.platforms[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {t.calendar.status}
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as PostStatus)}
              >
                {POST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.calendar.statuses[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              {t.calendar.date}
              <input
                type="date"
                value={form.date ?? ""}
                onChange={(e) => set("date", e.target.value || null)}
              />
            </label>
            <label className="field">
              {t.calendar.time}
              <input
                type="time"
                value={form.time ?? ""}
                disabled={!form.date}
                onChange={(e) => set("time", e.target.value || null)}
              />
            </label>
          </div>
          <label className="field">
            {t.calendar.project}
            <select
              value={form.projectId ?? ""}
              onChange={(e) => set("projectId", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t.common.noProject}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t.calendar.caption}
            <textarea
              value={form.caption}
              rows={5}
              onChange={(e) => set("caption", e.target.value)}
            />
          </label>
          <ErrorText error={error} />
        </form>
      </Modal>
      {confirmDelete && post && (
        <ConfirmDialog
          title={t.calendar.deleteTitle}
          body={t.tasks.deleteBody}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deletePost(post.id);
            onClose();
          }}
        />
      )}
    </>
  );
}
