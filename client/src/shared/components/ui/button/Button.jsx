// Components
import { Button as ButtonComponent } from "@/shared/components/shadcn/button";

const Button = ({ children, ...props }) => (
  <ButtonComponent {...props}>{children}</ButtonComponent>
);

export default Button;
