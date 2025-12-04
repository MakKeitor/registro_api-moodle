import axios from "axios"

export const apiLocal = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})
