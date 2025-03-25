import { AppManifest, TagTypes, PlatformTypes } from '@deskthing/types';
import { input, checkbox } from '@inquirer/prompts';
import semverValid from 'semver/functions/valid';
import semverValidRange from 'semver/ranges/valid'
import { compatible_client, compatible_server, version } from '../config/config';

export async function gatherAppManifest(projectName: string, templateId?: string): Promise<AppManifest> {

    const label = await input({
      message: 'App Label (Display Name):',
      default: projectName,
      validate: (input: string) => input.trim().length > 0 || 'Label is required',
      transformer: (input: string) => input.trim()
    });
  
    const tags = await checkbox({
      message: 'Select app tags:',
      choices: Object.values(TagTypes).map(tag => ({ value: tag, label: tag })),
    });
  
    const requires = await input({
      message: 'Required App IDs (comma-separated):',
      transformer: (input: string) => input,
      validate: (input: string) => input.trim().length >= 0,
    }).then(input => input ? input.split(',').map(str => str.trim()) : []);
  
    const appVersion = await input({
      message: `App Version (${version}):`,
      default: version,
      validate: (input: string) => {
        if (!semverValid(input)) {
          return 'Invalid semantic version'
        }
        return input.trim().length > 0 || 'Version is required'
      },
    });
  
    const requiredServerVersion = await input({
      message: `Please enter a valid semantic version for server compatibility\n (e.g. >=0.10.2, <=0.10.4) or ENTER to use default (>=${compatible_server})`,
      default: '>=0.0.0',
      transformer: (input: string) => input || `>=${compatible_server}`,
      validate: (input): boolean | string => {
        if (!semverValidRange(input)) {
          return 'Invalid server version range';
        }
        return true;
      }
    });
  
    const requiredClientVersion = await input({
      message: `Please enter a valid semantic version for client compatibility\n (e.g. >=0.10.2, <=0.10.4) or ENTER to use default (>=${compatible_client})`,
      default: `>=${compatible_client}`,
      transformer: (input: string) => input,
      validate: (input): boolean | string => {
        if (!semverValidRange(input)) {
          return 'Invalid client version range';
        }
        return true;
      }
    });
  
    const requiredVersions = {
      server: requiredServerVersion,
      client: requiredClientVersion
    };
  
    const description = await input({
      message: 'App Description:',
      default: 'None',
      validate: (input: string) => input.trim().length > 0 || 'Description is required',
    });
  
    const author = await input({
      message: 'Author:',
      default: 'Unknown',
    });
  
    const platforms = await checkbox({
      message: 'Select supported platforms:',
      choices: Object.values(PlatformTypes).map(platform => ({ value: platform, label: platform }))
    }) || Object.values(PlatformTypes);
  
    const repository = await input({
      message: 'Github Repository URL (optional):'
    });
  
    const homepage = await input({
      message: 'Homepage URL (optional):',
      default: repository || ''
    });
  
    const updateUrl = await input({
      message: 'Update URL (optional, usually same as repository):',
      default: repository || ''
    });
  
    return {
      label,
      tags,
      requires,
      version: appVersion,
      requiredVersions,
      description,
      author,
      platforms,
      repository,
      homepage,
      updateUrl,
      id: projectName,
      template: templateId,
    };
  }