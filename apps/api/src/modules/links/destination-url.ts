import { AppError } from "../../shared/errors/app-error.js";
import { errorCodes } from "../../shared/errors/error-codes.js";

const privateRanges = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./
];

export function validateDestinationUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw unsafeDestination();
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw unsafeDestination();
  }

  if (url.username !== "" || url.password !== "") {
    throw unsafeDestination();
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    privateRanges.some((pattern) => pattern.test(hostname))
  ) {
    throw unsafeDestination();
  }

  return url.toString();
}

function unsafeDestination(): AppError {
  return new AppError({
    code: errorCodes.UNSAFE_DESTINATION,
    message: "The destination URL is not allowed.",
    statusCode: 400
  });
}
