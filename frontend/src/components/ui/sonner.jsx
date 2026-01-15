import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-500",
          actionButton:
            "group-[.toast]:bg-black group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500",
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast }
