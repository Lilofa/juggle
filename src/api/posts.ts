import { call, mutate } from "./client";
import type { Post, PostInput } from "./types";

export const listPostsBetween = (from: string, to: string) =>
  call<Post[]>("list_posts_between", { from, to });
export const listUnscheduledPosts = () => call<Post[]>("list_unscheduled_posts");
export const getPost = (id: number) => call<Post>("get_post", { id });
export const createPost = (input: PostInput) => mutate<Post>("create_post", { input });
export const updatePost = (id: number, input: PostInput) =>
  mutate<Post>("update_post", { id, input });
export const deletePost = (id: number) => mutate<void>("delete_post", { id });

export const postToInput = (p: Post): PostInput => ({
  projectId: p.projectId,
  title: p.title,
  platform: p.platform,
  status: p.status,
  date: p.date,
  time: p.time,
  caption: p.caption,
});
