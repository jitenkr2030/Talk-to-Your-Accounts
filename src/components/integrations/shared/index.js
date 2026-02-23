/**
 * Shared Integration Components Index
 * 
 * This module exports all shared components and hooks for integration managers.
 * These components provide consistent UI and behavior across all platform integrations.
 * 
 * @example
 * ```jsx
 * import { BaseIntegrationCard, ConnectionStatus, SyncControls, PlatformConnect, useIntegrationManager } from './shared';
 * ```
 */

// Components
export { default as BaseIntegrationCard } from './BaseIntegrationCard';
export { default as ConnectionStatus } from './ConnectionStatus';
export { default as SyncControls } from './SyncControls';
export { default as PlatformConnect } from './PlatformConnect';

// Hooks
export { useIntegrationManager } from './hooks/useIntegrationManager';
