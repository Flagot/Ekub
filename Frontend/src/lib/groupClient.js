import apiClient from "../apiClient";

export const groupClient = {
  async listMine() {
    const { data } = await apiClient.get("/groups/mine");
    return data;
  },
  async create(payload) {
    const { data } = await apiClient.post("/groups", payload);
    return data;
  },
  async getById(groupId) {
    const { data } = await apiClient.get(`/groups/${groupId}`);
    return data;
  },
};
