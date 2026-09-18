export default defineEventHandler((event) => {
  setResponseHeader(event, "content-type", "text/plain; charset=utf-8");
  // Not cached: the message is trivial, and a cached 200 on the API root is a
  // nuisance when debugging routing.
  setResponseHeader(event, "cache-control", "no-store");

  return "Specify an API endpoint. This is the API root and serves no data.";
});