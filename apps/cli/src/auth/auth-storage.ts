import fs from 'fs';
import path from 'path';
import os from 'os';
import { z } from 'zod';
import { useAuthStore } from './auth-store.js';
import { decodeJwt } from 'jose';
import { APP_CONFIG_DIR } from '../constants.js';

const tokenConfigSchema = z.object({
  refreshToken: z
    .object({
      value: z.string(),
      expiry: z.number().catch(Date.now() + 31536000000), // 1 year
    })
    .optional(),
  accessToken: z
    .object({
      value: z.string(),
    })
    .optional(),
  isNeonEmployee: z.boolean().optional(),
});

type TokenConfig = z.infer<typeof tokenConfigSchema>;
export type Token = TokenConfig['accessToken'];

export class TokenStorage {
  private configFile: string;
  private _accessToken: Token | null = null;

  constructor() {
    this.configFile = path.join(APP_CONFIG_DIR, 'config.json');

    // Create config directory if it doesn't exist
    if (!fs.existsSync(APP_CONFIG_DIR)) {
      fs.mkdirSync(APP_CONFIG_DIR, { recursive: true, mode: 0o700 });
    }

    // Initialize empty config if file doesn't exist
    if (!fs.existsSync(this.configFile)) {
      this.writeConfig({});
    } else {
      // Validate existing config file
      try {
        this.readConfig();
      } catch (error) {
        console.error('Invalid config file detected. Creating new config.');
        this.writeConfig({});
      }
    }
  }

  // Read config with Zod validation
  private readConfig(): TokenConfig {
    try {
      const data = fs.readFileSync(this.configFile, 'utf8');
      const parsedData = JSON.parse(data);

      // Validate with Zod schema
      const validatedConfig = tokenConfigSchema.parse(parsedData);
      return validatedConfig;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Config file validation failed: ${error.message}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in config file: ${error.message}`);
      }
      throw new Error(
        `Error reading config file: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // Write config
  private writeConfig(config: TokenConfig): void {
    // Validate config before writing
    try {
      tokenConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid config data: ${error.message}`);
      }
      throw error;
    }

    fs.writeFileSync(
      this.configFile,
      JSON.stringify(config, null, 2),
      { mode: 0o600 }, // Restricting permissions for the config file
    );
  }

  // Save tokens
  saveTokens({
    accessToken,
    refreshToken,
  }: {
    accessToken: {
      value: string;
    };
    refreshToken?: {
      value: string;
      expiry: number;
    };
  }): void {
    // Update config with all token information
    const config = this.readConfig();

    if (refreshToken) {
      config.refreshToken = {
        value: refreshToken.value,
        expiry: refreshToken.expiry,
      };
    }

    config.accessToken = {
      value: accessToken.value,
    };
    this.writeConfig(config);

    if (config.refreshToken) {
      useAuthStore.getState().setRefreshToken(config.refreshToken);
    }
    useAuthStore.getState().setAccessToken(config.accessToken);

    // Keep access token in memory as well for quick access
    this._accessToken = accessToken;
  }

  // Get refresh token
  getRefreshToken(): Token | null {
    try {
      const config = this.readConfig();
      return config.refreshToken || null;
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      return null;
    }
  }

  // Get access token (from memory or file)
  getAccessToken(): Token | null {
    // If not in memory or expired, try to get from config file
    try {
      if (this._accessToken) {
        if (!this.isTokenExpired(this._accessToken.value)) {
          return this._accessToken;
        }
      }

      const config = this.readConfig();
      const configAccessToken = config.accessToken;
      if (!configAccessToken?.value) {
        return null;
      }

      // Check if token exists and is not expired
      if (!this.isTokenExpired(configAccessToken.value)) {
        // Store in memory for future quick access
        this._accessToken = configAccessToken;
        return configAccessToken;
      }
    } catch (error) {
      console.error('Error retrieving access token from config:', error);
    }

    return null;
  }

  // Check if we have tokens stored
  hasTokens(): boolean {
    return Boolean(this.getRefreshToken());
  }

  // Clear all tokens
  clearTokens(): void {
    // Clear from config
    try {
      const config = this.readConfig();
      delete config.refreshToken;
      delete config.accessToken;
      delete config.isNeonEmployee;
      this.writeConfig(config);
    } catch (error) {
      // If we can't read the config, just write an empty one
      this.writeConfig({});
    } finally {
      useAuthStore.getState().setRefreshToken(undefined);
      useAuthStore.getState().setAccessToken(undefined);
    }

    // Clear memory
    this._accessToken = null;
  }

  // Get the token expiry time
  getTokenExpiryInMS(accessToken: string): number {
    try {
      if (!accessToken) {
        return 0;
      }
      const decodedJwt = decodeJwt(accessToken);

      if (!decodedJwt.exp) {
        return 0;
      }

      return decodedJwt.exp * 1000;
    } catch (error) {
      return 0;
    }
  }

  // Check if token is expired or will expire soon
  isTokenExpired(accessToken: string): boolean {
    const expiry = this.getTokenExpiryInMS(accessToken);

    const bufferMs = 300 * 1000;
    return Date.now() >= expiry - bufferMs;
  }

  // Save if is neon employee
  saveIfNeonEmployee(isNeonEmployee: boolean): void {
    const config = this.readConfig();
    config.isNeonEmployee = isNeonEmployee;
    this.writeConfig(config);
  }

  getIsNeonEmployee(): boolean | undefined {
    try {
      const config = this.readConfig();
      return config.isNeonEmployee;
    } catch (error) {
      return undefined;
    }
  }
}

// Export a singleton instance
export const tokenStorage = new TokenStorage();
