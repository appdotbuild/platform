export type Pagination = { total: number, page: number, limit: number, totalPages:number}
export type Chatbot = {
  id: string;
  name: string;
  flyAppId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
};
export type Paginated<T> = {
  data: T[],
  pagination: Pagination
}
export type ReadUrl = {
  readUrl: string
}