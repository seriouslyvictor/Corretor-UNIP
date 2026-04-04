export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateModels } = await import("./lib/router");
    await validateModels();
  }
}
