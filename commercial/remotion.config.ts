import { Config } from '@remotion/cli/config';

// Use the pre-installed headless shell when present (cloud container); otherwise Remotion downloads its own.
import fs from 'node:fs';
const localShell = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
if (fs.existsSync(localShell)) Config.setBrowserExecutable(localShell);

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
