export type File = {
  file: Buffer | string;
  fileType: string;
  fileName: string;
  type: string;
  size?: number;
};
