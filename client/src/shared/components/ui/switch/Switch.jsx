import { Switch as SwitchComponent } from "@/shared/components/shadcn/switch";

const Switch = ({ onChange = () => {}, ...props }) => (
  <SwitchComponent onCheckedChange={onChange} {...props} />
);

export default Switch;
