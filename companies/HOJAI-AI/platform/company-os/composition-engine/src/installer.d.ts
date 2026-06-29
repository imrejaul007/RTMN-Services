/**
 * Installer
 *
 * Executes installation of departments, extensions, and workers
 * based on the installation plan.
 */
import { DepartmentType, InstallationPlan, DepartmentPackManifest, IndustryExtensionManifest, InstalledDepartment, InstalledExtension, InstalledWorker } from './types';
export interface InstallationResult {
    success: boolean;
    installedDepartments: InstalledDepartment[];
    installedExtensions: InstalledExtension[];
    installedWorkers: InstalledWorker[];
    errors: InstallationError[];
    duration: number;
}
export interface InstallationError {
    step: number;
    component: string;
    message: string;
    recoverable: boolean;
}
export declare class Installer {
    private companyId;
    private baseUrl;
    private errors;
    private startTime;
    constructor(companyId: string, baseUrl?: string);
    /**
     * Execute installation plan
     */
    execute(plan: InstallationPlan): Promise<InstallationResult>;
    /**
     * Install a department pack
     */
    installDepartment(dept: DepartmentType): Promise<InstalledDepartment | null>;
    /**
     * Install an industry extension
     */
    installExtension(extId: string): Promise<InstalledExtension | null>;
    /**
     * Install an AI worker
     */
    installWorker(workerId: string): Promise<InstalledWorker | null>;
    /**
     * Create installation plan from resolved dependencies
     */
    static createInstallationPlan(departments: string[], extensions: string[], workers: string[]): InstallationPlan;
    /**
     * Get all available department packs
     */
    static getDepartmentPacks(): DepartmentPackManifest[];
    /**
     * Get department pack by ID
     */
    static getDepartmentPack(dept: DepartmentType): DepartmentPackManifest | undefined;
    /**
     * Get all available extensions
     */
    static getExtensions(): IndustryExtensionManifest[];
    /**
     * Get extension by ID
     */
    static getExtension(extId: string): IndustryExtensionManifest | undefined;
    private simulateDelay;
}
