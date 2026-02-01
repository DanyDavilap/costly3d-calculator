import type { BrandConfig } from "./brand";

declare module "*.json" {
  const value: BrandConfig;
  export default value;
}
