export interface ManifestData {
  id: string;
  isAudioSource: boolean;
  isScreenSaver: boolean;
  isWebApp: boolean;
  requires: string[];
  label: string;
  version: string;
  version_code: number;
  compatible_server: number;
  compatible_client: number;
  description: string;
  author: string;
  platforms: string[];
  homepage: string;
  repository: string;
  template?: string
}