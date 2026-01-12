import { Toaster as Sonner, toast } from "sonner"

const Toaster = (props) => {
  return (
    <Sonner
      position="top-right"
      richColors
      {...props}
    />
  );
}

export { Toaster, toast }
