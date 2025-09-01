type DeleteAppSuccessResponse = {
  id: string;
  ownerId: string;
  message: string;
};

type DeleteAppErrorResponse = {
  id: string;
  error: string;
};

export type DeleteAppResponse =
  | DeleteAppSuccessResponse
  | DeleteAppErrorResponse;
