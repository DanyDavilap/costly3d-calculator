export type BrandConfig = {
  name: string;
  logo: string;
  colors: Record<string, string>;
};

declare module "*.json" {
  const value: BrandConfig;
  export default value;
}
