import apiClient from "../apiClient";

export const groupClient = {
  async dashboard() {
    const { data } = await apiClient.get("/groups/dashboard");
    return data;
  },
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
  async listPublic() {
    const { data } = await apiClient.get("/groups/public");
    return data;
  },
  async requestJoin(groupId) {
    const { data } = await apiClient.post(`/groups/${groupId}/join`);
    return data;
  },
};
