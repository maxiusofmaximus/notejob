const form = document.getElementById("adminLoginForm") as HTMLFormElement;
const username = document.getElementById("adminUser") as HTMLInputElement;
const password = document.getElementById("adminPass") as HTMLInputElement;
const errorLine = document.getElementById("adminLoginError") as HTMLParagraphElement;

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  errorLine.textContent = "";
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: username.value.trim(),
      password: password.value
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    errorLine.textContent = data?.error || "Could not sign in.";
    return;
  }
  window.location.href = "/admin";
});
