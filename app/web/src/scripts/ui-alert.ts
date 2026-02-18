type AlertIcon = "success" | "error" | "warning" | "info" | "question";

type AlertOptions = {
  icon?: AlertIcon;
  title: string;
  text?: string;
  confirmText?: string;
};

let swalLoader: Promise<any> | null = null;

async function getSwal() {
  if (!swalLoader) {
    swalLoader = import("https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm");
  }
  return swalLoader;
}

export const swap = {
  async fire(options: AlertOptions) {
    const mod = await getSwal();
    const Swal = mod.default;
    return Swal.fire({
      icon: options.icon || "info",
      title: options.title,
      text: options.text || "",
      confirmButtonText: options.confirmText || "OK",
      customClass: {
        popup: "notejob-swal",
        title: "notejob-swal__title",
        htmlContainer: "notejob-swal__text",
        confirmButton: "btn btn--primary notejob-swal__confirm"
      },
      buttonsStyling: false,
      allowOutsideClick: true,
      allowEscapeKey: true
    });
  }
};

export async function notifyInfo(title: string, text?: string) {
  await swap.fire({ icon: "info", title, text });
}

export async function notifySuccess(title: string, text?: string) {
  await swap.fire({ icon: "success", title, text });
}

export async function notifyWarning(title: string, text?: string) {
  await swap.fire({ icon: "warning", title, text });
}

export async function notifyError(title: string, text?: string) {
  await swap.fire({ icon: "error", title, text });
}
