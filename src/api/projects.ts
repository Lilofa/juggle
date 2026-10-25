import { call, mutate } from "./client";
import type { Project, ProjectInput } from "./types";

export const listProjects = () => call<Project[]>("list_projects");
export const createProject = (input: ProjectInput) => mutate<Project>("create_project", { input });
export const updateProject = (id: number, input: ProjectInput) =>
  mutate<Project>("update_project", { id, input });
export const setProjectArchived = (id: number, archived: boolean) =>
  mutate<Project>("set_project_archived", { id, archived });
export const deleteProject = (id: number) => mutate<void>("delete_project", { id });
