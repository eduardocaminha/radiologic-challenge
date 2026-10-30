import { cn } from "@/lib/utils";

const LOGO_PATH =
  "M62.5 0C83.2107 0 100 16.7893 100 37.5C100 54.4227 88.7896 68.7241 73.3906 73.3906L100 100H0V0H62.5Z";

interface LogoProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

export function Logo({ className, ...rest }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-5", className)}
      {...rest}
    >
      <path d={LOGO_PATH} />
    </svg>
  );
}
