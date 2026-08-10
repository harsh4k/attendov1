import { queryOptions } from "@tanstack/react-query";
import { getMe, getStudentData, getFacultyData, getAdminData } from "./api.functions";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: () => getMe(),
  staleTime: 30_000,
});

export const studentDataQuery = queryOptions({
  queryKey: ["student-data"],
  queryFn: () => getStudentData(),
});

export const facultyDataQuery = queryOptions({
  queryKey: ["faculty-data"],
  queryFn: () => getFacultyData(),
});

export const adminDataQuery = queryOptions({
  queryKey: ["admin-data"],
  queryFn: () => getAdminData(),
});
