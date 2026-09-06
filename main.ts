import { App, Editor, FileSystemAdapter, MarkdownFileInfo, MarkdownRenderer, Menu, Modal, Notice, Plugin, PluginSettingTab, requestUrl, setIcon, Setting, TFile, TFolder } from 'obsidian';
type AIImageAnalyzerAPI = {
	analyzeImage: (file: TFile) => Promise<string>;
	canBeAnalyzed: (file: TFile) => boolean;
	isInCache: (file: TFile) => Promise<boolean>;
};

type FailedProcessingFile = {
    path: string;
    reason: string;
    attempts: number;
    lastFailedAt: number;
};

type ShutdownProtectionStage = "queued" | "fingerprinted" | "duplicate-decision" | "waiting-duplicate-choice" | "waiting-bfm-note" | "processing" | "writing";
type ProtectedJobSource = "shutdown" | "manual-vault-reprocess";

type ProtectedProcessingJob = {
    path: string;
    notePath?: string;
    stage: ShutdownProtectionStage;
    queuedAt: number;
    updatedAt: number;
    exactHash?: string;
    visualHash?: string;
    runId?: string;
    duplicateAction?: DuplicateAction | null;
    duplicateMigrateLinks?: boolean;
    duplicateMatchType?: DuplicateMatchType;
    duplicateMatchPath?: string;
    source?: ProtectedJobSource;
};

type QueuedProcessingFile = {
    file: TFile;
    runId: string;
};

type PairRecord = {
    pairId: string;
    imagePath: string;
    notePath?: string;
    createdAt: number;
    updatedAt: number;
};

type ActiveRunPair = {
    runId: string;
    pairId: string;
    imagePath: string;
    expectedNotePath: string;
    resolvedNotePath?: string;
};

type PendingDuplicateAction = {
    runId: string;
    newImagePath: string;
    newNotePath: string;
    originalImagePath?: string;
    originalNotePath?: string;
    action: DuplicateAction;
    autorename: boolean;
    processingComplete?: boolean;
};

type PendingManualPairAction = {
    imagePath: string;
    notePath: string;
};

type BfmAutotagFileContext = {
    selectedFile: TFile;
    isWatchedSource: boolean;
    isCompanionNote: boolean;
    sourceFile: TFile | null;
    companionNote: TFile | null;
    pairRecord: PairRecord | null;
    sourcePath?: string;
    companionPath?: string;
};

type FolderPropertyMapping = {
    id: string;
    property: string;
    values: string[];
    format: string;
    useAsAiCandidate: boolean;
    useAsVaultCandidate: boolean;
};

type GeolocationProvider = "disabled" | "public-nominatim" | "local-nominatim";
type GeolocationField = "latitude" | "longitude" | "altitude" | "country" | "region" | "county" | "city" | "suburb" | "road" | "postcode" | "houseNumber" | "address" | "displayName";

type GeolocationPropertyMapping = {
    id: string;
    field: GeolocationField;
    property: string;
    format: string;
};

type PendingGeocodeJob = {
    imagePath: string;
    notePath: string;
    latitude: number;
    longitude: number;
    attempts: number;
    queuedAt: number;
    nextTryAt: number;
    lastError?: string;
};

type GeocodeCacheEntry = {
    latitude: number;
    longitude: number;
    data: Record<string, string>;
    updatedAt: number;
};

type GeneratedAiTagResult = {
    aiTags: string[];
    vaultAwarenessTags: string[];
};

type GeneratedMarkdownPreviewRefs = {
    checkPanelEl: HTMLElement;
    titleTextEl: HTMLElement;
    listEl: HTMLElement;
    cleanTextEl: HTMLElement;
    previewPanelEl: HTMLElement;
    codeEl: HTMLElement;
};

type TemplatePropertySuggestionRefs = {
    panelEl: HTMLElement;
    titleTextEl: HTMLElement;
    listEl: HTMLElement;
    cleanTextEl: HTMLElement;
};

type ProgressNoticeController = {
    setProgress: (done: number, nextSubtitle?: string) => void;
    hide: () => void;
};

type HealthCheckTone = "success" | "warning" | "danger" | "accent" | "neutral";

type HealthCheckResult = {
    tone: HealthCheckTone;
    value: string;
    message: string;
    checks?: HealthDashboardCheck[];
};

type HealthDashboardCheckTone = HealthCheckTone | "spinner";

type HealthDashboardCheck = {
    tone: HealthDashboardCheckTone;
    text: string;
};

type HealthDashboardCard = {
    id: string;
    label: string;
    icon: string;
    targetSectionId: string;
    solutionAnchorId?: string;
    value: string;
    description: string;
    checks?: HealthDashboardCheck[];
    info?: string;
    tone?: HealthCheckTone;
};

type HealthDashboardCardRefs = {
    cardEl: HTMLElement;
    valueEl: HTMLElement;
    descriptionEl: HTMLElement;
    checksEl: HTMLElement;
};

type GpsCoordinates = {
    latitude: number;
    longitude: number;
    altitude?: number;
};

type ImageGeolocationContext = {
    coordinates: GpsCoordinates;
    locationData: Record<string, string>;
};

type LimitedFileTypeWarningDefinition = {
    extension: string;
    label: string;
    description: string;
};

type DuplicateDetectionMode = "off" | "exact" | "exact-visual";
type DuplicateMatchType = "exact" | "visual";
type DuplicateAction = "ask" | "process" | "delete-new-pair" | "replace-original-keep-original" | "replace-original-keep-new";

type DuplicateRecord = {
    filePath: string;
    notePath: string;
    exactHash: string;
    visualHash?: string;
    processedAt: number;
};

type DuplicateMatch = {
    type: DuplicateMatchType;
    record: DuplicateRecord;
    similarity?: number;
    distance?: number;
};

type DuplicateDecision = {
    action: DuplicateAction;
    migrateLinks: boolean;
    autorename: boolean;
};

type DuplicateFingerprint = {
    exactHash: string;
    visualHash?: string;
};

type ExistingVaultCompanionSummary = {
    total: number;
    existing: number;
    created: number;
    skipped: number;
    failed: number;
};

type DuplicateHandlingResult = {
    match: DuplicateMatch | null;
    exactHash: string;
    visualHash?: string;
    action: DuplicateAction | null;
    migrateLinks: boolean;
    autorename: boolean;
    decisionPromise?: Promise<DuplicateDecision>;
};

type VaultVocabularySource = "configured";
type CandidateMode = "disabled" | "consider" | "all" | "exclude";

type LinguisticFeatureMode = "exclude" | "base" | "use";

type TemplateSource = "internal" | "bfm-templater";
type SettingsProfileFile = {
    name?: string;
    custom?: boolean;
    sourceName?: string;
    createdAt?: number;
    updatedAt?: number;
    settings?: Partial<BfmAutotagSettings>;
};

type SettingsProfileSummary = {
    id: string;
    name: string;
    custom: boolean;
    sourceName?: string;
    builtIn: boolean;
    path?: string;
    settings: Partial<BfmAutotagSettings>;
};

const BUILTIN_DEFAULT_SETTINGS_PROFILE_ID = "builtin:default";
const BUILTIN_DEV_SETTINGS_PROFILE_ID = "builtin:dev";
const SETTINGS_PROFILE_FOLDER_NAME = "settings-profiles";
const SETTINGS_PROFILE_CUSTOM_SUFFIX = " [Custom]";

type LinguisticFeatureSettings = {
    synonyms: LinguisticFeatureMode;
    grammaticalVariants: LinguisticFeatureMode;
    compoundDecomposition: LinguisticFeatureMode;
    vaultAliases: LinguisticFeatureMode;
    acronymsAbbreviations: LinguisticFeatureMode;
    spellingVariants: LinguisticFeatureMode;
    broaderNarrower: LinguisticFeatureMode;
    canonicalization: LinguisticFeatureMode;
};

type LinguisticFeatureKey = keyof LinguisticFeatureSettings;

const DEFAULT_LINGUISTIC_FEATURES: LinguisticFeatureSettings = {
    synonyms: "use",
    grammaticalVariants: "use",
    compoundDecomposition: "use",
    vaultAliases: "use",
    acronymsAbbreviations: "use",
    spellingVariants: "use",
    broaderNarrower: "use",
    canonicalization: "use",
};

const LINGUISTIC_FEATURE_OPTIONS: { key: LinguisticFeatureKey; name: string; description: string }[] = [
    { key: "synonyms", name: "Synonyms and Near-Synonyms", description: "Controls closely equivalent words such as rug and carpet." },
    { key: "grammaticalVariants", name: "Singular, Plural and Grammatical Variants", description: "Controls grammatical forms such as architecture and architectural." },
    { key: "compoundDecomposition", name: "Compound Decomposition", description: "Controls concepts contained within longer phrases and compound terms." },
    { key: "vaultAliases", name: "Aliases from Your Vault", description: "Controls note aliases as alternative names for canonical vault concepts." },
    { key: "acronymsAbbreviations", name: "Acronyms and Abbreviations", description: "Controls shortened forms and their expanded concepts." },
    { key: "spellingVariants", name: "Spelling Variants", description: "Controls alternate spellings, spacing and hyphenation." },
    { key: "broaderNarrower", name: "Conservative Broader/Narrower Concepts", description: "Controls direct parent or child concepts when the taxonomy is clear." },
    { key: "canonicalization", name: "Canonicalization", description: "Controls writing the preferred vault note name for equivalent aliases." },
];
type VaultVocabularyRecord = {
    name: string;
    source: VaultVocabularySource;
    lastSeen: number;
    aliases: string[];
};

type VaultVocabularyEntry = {
    name: string;
    frequency: number;
    lastSeen: number;
    sources: Set<VaultVocabularySource>;
    aliases: Set<string>;
};

interface BfmAutotagSettings {
    settingsProfileId: string; // Active import/export setup profile
    basePath: string;             // Folder where watched files are placed
    bfmNewFileLocation: string;   // Folder where BFM notes are created
    bfmFileNameFormat: string;    // BFM metadata filename format
    clearDropdownExcludedProperties: string[]; // Extra frontmatter properties hidden from property dropdowns
    hideLimitedFileTypeWarnings: boolean; // Collapse limited file type warning controls
    limitedFileTypeWarningSkips: Record<string, boolean>; // Per-extension compatibility popup suppression
    linkToFilePropertyEnabled: boolean; // Write link-to-file property
    linkToFilePropertyName: string; // Property name for link to source file
    fileTypePropertyEnabled: boolean; // Write file extension property
    fileTypePropertyName: string; // Property name for source file extension
    embedPropertyEnabled: boolean; // Write embedded source file property
    embedPropertyName: string; // Property name for embedded source file
    aiTagsPropertyEnabled: boolean; // Write AI-generated tags property
    aiTagsPropertyName: string; // Property name for AI-generated tags
    aiTagsFormat: string; // Formatting template for AI-generated tags
    aiTagsUseAsVaultCandidate: boolean; // Use AI-generated tags as vault-awareness candidates
    aiDescriptionPropertyEnabled: boolean; // Write AI-generated description property
    aiDescriptionPropertyName: string; // Property name for AI-generated description
    useGeolocationForAiDescription: boolean; // Use known geolocation metadata to improve AI descriptions
    processedFiles: string[];     // Store paths of already handled files
    failedFiles: FailedProcessingFile[]; // Store files that failed processing
    shutdownProtectionEnabled: boolean; // Persist unfinished queue items across reloads
    autoProcessUnprocessedOnReload: boolean; // Queue unprocessed watched files when the plugin loads
    deleteLinkedFilePair: boolean; // Delete companion/source counterpart when one side is deleted
    createMissingCompanionNote: boolean; // Create companion note if BFM fails repeatedly
    deleteLonelyFileWithoutCompanion: boolean; // Delete source file if no companion note exists after retries
    lonelyDeletedImageCount: number; // Count files deleted because no companion note appeared
    protectedJobs: ProtectedProcessingJob[]; // Persisted queue/resume checkpoints
    useDuplicateProtection: boolean; // Use duplicate fingerprinting and duplicate actions
    folderPropertyMappings: FolderPropertyMapping[]; // Folder names mapped to custom frontmatter properties
    folderFallbackProperty: string; // Frontmatter property for folder names not matched by property lists
    folderFallbackFormat: string; // Formatting template for fallback folder values
    folderFallbackUseAsAiCandidate: boolean; // Use fallback folder values as AI candidates
    folderFallbackUseAsVaultCandidate: boolean; // Use fallback folder property as a vault-awareness candidate
    useFolderTags: boolean; // Use folder names for frontmatter values
    templateSource: TemplateSource; // Where the base note template comes from
    frontmatterTemplate: string; // Template for generated companion note frontmatter
    writeImageEmbedInBody: boolean; // Write image embed into note body after frontmatter
    geolocationEnabled: boolean; // Read GPS metadata and write configured geolocation properties
    geolocationProvider: GeolocationProvider; // Reverse geocoding provider
    geolocationLocalUrl: string; // Local Nominatim endpoint
    geolocationProperties: GeolocationPropertyMapping[]; // Geolocation output fields mapped to properties
    geocodeCache: Record<string, GeocodeCacheEntry>; // Cached reverse geocode results
    pendingGeocodeJobs: PendingGeocodeJob[]; // Persisted reverse geocode queue
    geocodePublicDay: string; // Day key for public Nominatim cap
    geocodePublicRequestsToday: number; // Public Nominatim requests used today
    geocodeLastRequestAt: number; // Timestamp of the last reverse geocode request
    aiTaggingEnabled: boolean;    // Generate semantic AI tags from the image description
    folderTagsCandidateMode: CandidateMode; // How folder-derived tags contribute to AI tags
    manualEnrichmentRules: string; // Manual concept expansion rules
    manualSubjectBridgeRules: string; // Absolute personal concept relationships
    bridgeEnabled: boolean; // Apply manual bridge enrichment rules
    bridgeUsePreBridgeVaultAwarenessOutput: boolean; // Include pre-bridge/related bridge terms in Vault Awareness output
    bridgeLinguisticFeatures: LinguisticFeatureSettings;
    hideBridgeLinguisticFeatures: boolean;
    vocabularyCandidateProperties?: string[]; // Deprecated; candidate properties now come from visible per-property toggles
    excludedVocabularyTerms: string[]; // Terms excluded from vault candidate vocabulary
    filenameCandidateMode: CandidateMode; // How image filenames contribute to AI tags
    maxPromptVocabularyTerms: number; // Max vault vocabulary candidates sent to Ollama
    vaultAwarenessEnabled: boolean; // Add known vault vocabulary after base AI tagging
    maxVaultAwareAdditions: number; // Max known vault concepts added by vault awareness
    vaultAwarenessOutputEnabled: boolean; // Write Vault Awareness additions to a separate property
    vaultAwarenessOutputPropertyName: string; // Property name for separate Vault Awareness additions
    vaultAwarenessOutputFormat: string; // Formatting template for separate Vault Awareness additions
    vaultAwarenessOutputExclusive: boolean; // Keep Vault Awareness additions out of AI tags when writing separately
    vaultLinguisticFeatures: LinguisticFeatureSettings;
    hideVaultLinguisticFeatures: boolean;
    ollamaGeneratedTagsCap: number; // Max Ollama aitags written; 0 means infinite
    ollamaBaseUrl: string;        // Local Ollama server URL
    ollamaModel: string;          // Local Ollama model name
    duplicateDetectionMode: DuplicateDetectionMode; // Duplicate detection strategy
    exactDuplicateAction: DuplicateAction; // Action for exact duplicate matches
    visualDuplicateAction: DuplicateAction; // Action for visual duplicate matches
    visualDuplicateThreshold: number; // Max perceptual hash distance for visual duplicates
    duplicateMigrateLinksOnReplace: boolean; // Rewrite old duplicate links to kept duplicate paths
    duplicateAutorenameOnReplace: boolean; // Rename kept duplicate files after replacing old duplicates
    waitForDuplicateSourceProcessing: boolean; // Block processing on duplicate decisions instead of continuing while the popup is open
    duplicateRecords: DuplicateRecord[]; // Stored duplicate fingerprints
    pairRecords: PairRecord[]; // Stable image/companion ownership pairs
    parallelWorkers: number;      // Max files processed in parallel
    bfmNoteMaxWaitMs: number;     // Max time to wait for BFM companion note
    bfmNotePollIntervalMs: number;// Poll interval while waiting for BFM note
    queueBatchMaxWaitMs: number;  // Max debounce window when batching dropped files
    maxProcessingAttempts: number;// Max attempts before a failed file stops retrying
}

const DEFAULT_SETTINGS: BfmAutotagSettings = {
    settingsProfileId: BUILTIN_DEFAULT_SETTINGS_PROFILE_ID,
    basePath: 'Files/Attachments/Ata File',
    bfmNewFileLocation: 'Files/Attachments/Ata Data',
    bfmFileNameFormat: 'Ata_{{NAME}}_{{EXTENSION}}',
    clearDropdownExcludedProperties: [],
    hideLimitedFileTypeWarnings: true,
    limitedFileTypeWarningSkips: {},
    linkToFilePropertyEnabled: true,
    linkToFilePropertyName: 'linktofile',
    fileTypePropertyEnabled: true,
    fileTypePropertyName: 'filetype',
    embedPropertyEnabled: true,
    embedPropertyName: 'embed',
    aiTagsPropertyEnabled: true,
    aiTagsPropertyName: 'aitags',
    aiTagsFormat: '',
    aiTagsUseAsVaultCandidate: true,
    aiDescriptionPropertyEnabled: true,
    aiDescriptionPropertyName: 'aidescription',
    useGeolocationForAiDescription: true,
    processedFiles: [],
    failedFiles: [],
    shutdownProtectionEnabled: true,
    autoProcessUnprocessedOnReload: false,
    deleteLinkedFilePair: true,
    createMissingCompanionNote: true,
    deleteLonelyFileWithoutCompanion: false,
    lonelyDeletedImageCount: 0,
    protectedJobs: [],
    useDuplicateProtection: true,
    folderPropertyMappings: [
        { id: 'domains', property: 'domains', values: [], format: '', useAsAiCandidate: true, useAsVaultCandidate: true },
        { id: 'types', property: 'types', values: [], format: '', useAsAiCandidate: true, useAsVaultCandidate: true },
    ],
    folderFallbackProperty: 'autotag-fallback',
    folderFallbackFormat: '',
    folderFallbackUseAsAiCandidate: true,
    folderFallbackUseAsVaultCandidate: true,
    useFolderTags: false,
    templateSource: 'internal',
    frontmatterTemplate: [
        'domains:',
        'types:',
        '- Ata',
        'related:',
        'currentStatus:',
        'linktofile: This text will be overwritten',
        'filetype: This text will be overwritten',
        'embed: This text will be overwritten',
        'lastModified:',
        'created:',
        'aitags:',
        '- This text will be overwritten',
        'aidescription: This text will be overwritten',
        'tags:',
        '- excalidraw',
        'excalidraw-plugin: parsed',
        'excalidraw-open-md: true',
    ].join('\n'),
    writeImageEmbedInBody: true,
    geolocationEnabled: false,
    geolocationProvider: 'public-nominatim',
    geolocationLocalUrl: 'http://127.0.0.1:8080',
    geolocationProperties: [
        { id: 'latitude', field: 'latitude', property: 'latitude', format: '' },
        { id: 'longitude', field: 'longitude', property: 'longitude', format: '' },
        { id: 'country', field: 'country', property: 'country', format: '' },
        { id: 'city', field: 'city', property: 'city', format: '' },
    ],
    geocodeCache: {},
    pendingGeocodeJobs: [],
    geocodePublicDay: '',
    geocodePublicRequestsToday: 0,
    geocodeLastRequestAt: 0,
    aiTaggingEnabled: false,
    folderTagsCandidateMode: 'all',
    manualEnrichmentRules: '',
    manualSubjectBridgeRules: '',
    bridgeEnabled: false,
    bridgeUsePreBridgeVaultAwarenessOutput: true,
    bridgeLinguisticFeatures: { ...DEFAULT_LINGUISTIC_FEATURES },
    hideBridgeLinguisticFeatures: true,
    excludedVocabularyTerms: ['Ata'],
    filenameCandidateMode: 'all',
    maxPromptVocabularyTerms: 100,
    vaultAwarenessEnabled: false,
    maxVaultAwareAdditions: 20,
    vaultAwarenessOutputEnabled: false,
    vaultAwarenessOutputPropertyName: 'vaulttags',
    vaultAwarenessOutputFormat: '',
    vaultAwarenessOutputExclusive: false,
    vaultLinguisticFeatures: { ...DEFAULT_LINGUISTIC_FEATURES },
    hideVaultLinguisticFeatures: true,
    ollamaGeneratedTagsCap: 100,
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    ollamaModel: 'qwen3:8b',
    duplicateDetectionMode: 'exact',
    exactDuplicateAction: 'ask',
    visualDuplicateAction: 'ask',
    visualDuplicateThreshold: 8,
    duplicateMigrateLinksOnReplace: false,
    duplicateAutorenameOnReplace: true,
    waitForDuplicateSourceProcessing: true,
    duplicateRecords: [],
    pairRecords: [],
    parallelWorkers: 4,
    bfmNoteMaxWaitMs: 5000,
    bfmNotePollIntervalMs: 500,
    queueBatchMaxWaitMs: 15000,
    maxProcessingAttempts: 3,
};

const SETTINGS_PROFILE_CONTROLLED_KEYS: (keyof BfmAutotagSettings)[] = [
    "basePath",
    "bfmNewFileLocation",
    "bfmFileNameFormat",
    "clearDropdownExcludedProperties",
    "hideLimitedFileTypeWarnings",
    "limitedFileTypeWarningSkips",
    "linkToFilePropertyEnabled",
    "linkToFilePropertyName",
    "fileTypePropertyEnabled",
    "fileTypePropertyName",
    "embedPropertyEnabled",
    "embedPropertyName",
    "aiTagsPropertyEnabled",
    "aiTagsPropertyName",
    "aiTagsFormat",
    "aiTagsUseAsVaultCandidate",
    "aiDescriptionPropertyEnabled",
    "aiDescriptionPropertyName",
    "useGeolocationForAiDescription",
    "shutdownProtectionEnabled",
    "autoProcessUnprocessedOnReload",
    "deleteLinkedFilePair",
    "createMissingCompanionNote",
    "deleteLonelyFileWithoutCompanion",
    "useDuplicateProtection",
    "folderPropertyMappings",
    "folderFallbackProperty",
    "folderFallbackFormat",
    "folderFallbackUseAsAiCandidate",
    "folderFallbackUseAsVaultCandidate",
    "useFolderTags",
    "templateSource",
    "frontmatterTemplate",
    "writeImageEmbedInBody",
    "geolocationEnabled",
    "geolocationProvider",
    "geolocationLocalUrl",
    "geolocationProperties",
    "aiTaggingEnabled",
    "folderTagsCandidateMode",
    "manualEnrichmentRules",
    "manualSubjectBridgeRules",
    "bridgeEnabled",
    "bridgeUsePreBridgeVaultAwarenessOutput",
    "bridgeLinguisticFeatures",
    "hideBridgeLinguisticFeatures",
    "excludedVocabularyTerms",
    "filenameCandidateMode",
    "maxPromptVocabularyTerms",
    "vaultAwarenessEnabled",
    "maxVaultAwareAdditions",
    "vaultAwarenessOutputEnabled",
    "vaultAwarenessOutputPropertyName",
    "vaultAwarenessOutputFormat",
    "vaultAwarenessOutputExclusive",
    "vaultLinguisticFeatures",
    "hideVaultLinguisticFeatures",
    "ollamaGeneratedTagsCap",
    "ollamaBaseUrl",
    "ollamaModel",
    "duplicateDetectionMode",
    "exactDuplicateAction",
    "visualDuplicateAction",
    "visualDuplicateThreshold",
    "duplicateMigrateLinksOnReplace",
    "duplicateAutorenameOnReplace",
    "waitForDuplicateSourceProcessing",
    "parallelWorkers",
    "bfmNoteMaxWaitMs",
    "bfmNotePollIntervalMs",
    "queueBatchMaxWaitMs",
    "maxProcessingAttempts",
];


const RECOMMENDED_TAGGING_MODELS = [
    { name: "qwen3:8b", label: "qwen3:8b (recommended)" },
    { name: "qwen3:4b", label: "qwen3:4b" },
    { name: "qwen2.5:7b", label: "qwen2.5:7b" },
    { name: "llama3.1:8b", label: "llama3.1:8b" },
    { name: "mistral:7b", label: "mistral:7b" },
    { name: "gemma3:4b", label: "gemma3:4b" },
    { name: "phi4-mini", label: "phi4-mini" },
];

const QUEUE_BATCH_DELAY_MS = 1000;
const PUBLIC_NOMINATIM_DELAY_MS = 2000;
const PUBLIC_NOMINATIM_DAILY_CAP = 250;
const MAX_GEOCODE_BACKOFF_MS = 24 * 60 * 60 * 1000;
const GEOLOCATION_FIELD_OPTIONS: { field: GeolocationField; label: string; defaultProperty: string }[] = [
    { field: "latitude", label: "Latitude", defaultProperty: "latitude" },
    { field: "longitude", label: "Longitude", defaultProperty: "longitude" },
    { field: "altitude", label: "Altitude", defaultProperty: "altitude" },
    { field: "country", label: "Country", defaultProperty: "country" },
    { field: "region", label: "State / Region", defaultProperty: "region" },
    { field: "county", label: "County", defaultProperty: "county" },
    { field: "city", label: "City / Town / Village", defaultProperty: "city" },
    { field: "suburb", label: "Suburb", defaultProperty: "suburb" },
    { field: "road", label: "Road / Street", defaultProperty: "street" },
    { field: "postcode", label: "Postcode", defaultProperty: "postcode" },
    { field: "houseNumber", label: "House Number", defaultProperty: "house-number" },
    { field: "address", label: "Full Address", defaultProperty: "address" },
    { field: "displayName", label: "Raw Provider Display Name", defaultProperty: "location-display" },
];

const LIMITED_FILE_TYPE_WARNINGS: LimitedFileTypeWarningDefinition[] = [
    { extension: "avif", label: "AVIF", description: "Modern compressed image. AI description and visual duplicate preview support depend on Obsidian, Electron, and AI Image Analyzer support." },
    { extension: "heic", label: "HEIC", description: "Apple/iPhone photo container. Autotag can create notes and exact hashes, but AI description, previews, and GPS parsing may depend on external support." },
    { extension: "heif", label: "HEIF", description: "Apple/iPhone image container. Autotag can create notes and exact hashes, but AI description, previews, and GPS parsing may depend on external support." },
    { extension: "tif", label: "TIFF", description: "Archival image format. Large files or uncommon encodings may fail in AI description or visual duplicate preview." },
    { extension: "tiff", label: "TIFF", description: "Archival image format. Large files or uncommon encodings may fail in AI description or visual duplicate preview." },
    { extension: "jxl", label: "JPEG XL", description: "JPEG XL is not consistently supported by Electron or analyzer plugins yet." },
    { extension: "svg", label: "SVG", description: "Vector images may render in Obsidian, but AI image analysis and metadata extraction may behave differently from raster images." },
    { extension: "ico", label: "ICO", description: "Icon containers may include multiple embedded image sizes and may not analyze like ordinary images." },
    { extension: "psd", label: "Photoshop PSD", description: "Layered Photoshop documents usually need export to a flat image before image analysis can read them reliably." },
    { extension: "psb", label: "Photoshop PSB", description: "Large layered Photoshop documents usually need export to a flat image before image analysis can read them reliably." },
    { extension: "raw", label: "RAW", description: "Camera raw files usually need conversion before image analysis, visual preview hashing, or metadata extraction can work reliably." },
    { extension: "dng", label: "DNG", description: "Camera raw files usually need conversion before image analysis, visual preview hashing, or metadata extraction can work reliably." },
    { extension: "cr2", label: "Canon CR2", description: "Camera raw files usually need conversion before image analysis, visual preview hashing, or metadata extraction can work reliably." },
    { extension: "cr3", label: "Canon CR3", description: "Camera raw files usually need conversion before image analysis, visual preview hashing, or metadata extraction can work reliably." },
    { extension: "nef", label: "Nikon NEF", description: "Camera raw files usually need conversion before image analysis, visual preview hashing, or metadata extraction can work reliably." },
    { extension: "arw", label: "Sony ARW", description: "Camera raw files usually need conversion before image analysis, visual preview hashing, or metadata extraction can work reliably." },
    { extension: "rw2", label: "Panasonic RW2", description: "Camera raw files usually need conversion before image analysis, visual preview hashing, or metadata extraction can work reliably." },
    { extension: "orf", label: "Olympus ORF", description: "Camera raw files usually need conversion before image analysis, visual preview hashing, or metadata extraction can work reliably." },
    { extension: "raf", label: "Fujifilm RAF", description: "Camera raw files usually need conversion before image analysis, visual preview hashing, or metadata extraction can work reliably." },
];

export default class BfmAutotagPlugin extends Plugin {
    settings: BfmAutotagSettings;
    processingQueue = new Map<string, QueuedProcessingFile>();
    queueFlushTimer: number | null = null;
    queueBatchStartedAt: number | null = null;
    isProcessingQueue = false;
    vocabularyByFile = new Map<string, VaultVocabularyRecord[]>();
    vaultVocabulary = new Map<string, VaultVocabularyEntry>();
    vaultAliasToCanonical = new Map<string, string>();
    duplicateClaimLock: Promise<void> = Promise.resolve();
    duplicateFingerprintCache = new Map<string, Promise<DuplicateFingerprint>>();
    deletionCascadePaths = new Set<string>();
    deletionSuppressedPaths = new Set<string>();
    deletionSuppressedRunIds = new Map<string, string | null>();
    currentRunIds = new Map<string, string>();
    activeRunPairs = new Map<string, ActiveRunPair>();
    pendingDuplicateActions = new Map<string, PendingDuplicateAction>();
    pendingManualPairActions = new Map<string, PendingManualPairAction>();
    duplicateHandlingCache = new Map<string, Promise<DuplicateHandlingResult>>();
    duplicateProcessingCompletion = new Map<string, Promise<void>>();
    duplicateProcessingCompletionResolvers = new Map<string, () => void>();
    scheduledDuplicateDecisionHandlers = new Set<string>();
    activeLimitedFileTypeWarningExtensions = new Set<string>();
    activeProcessingNotice: ProgressNoticeController | null = null;
    activeProcessingNoticeTimer: number | null = null;
    activeProcessingStartedAt: number | null = null;
    activeProcessingTotal = 0;
    activeProcessingCompleted = 0;
    activeWorkerPaths = new Set<string>();
    settingTab: BfmAutotagSettingTab | null = null;
    private isApplyingSettingsProfile = false;
    private settingsProfileSnapshot = "";
    createRunId(path: string): string {
        return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10) + "-" + path;
    }

    getRunCacheKey(path: string, runId?: string): string {
        return runId ? path + "::" + runId : path;
    }

    createPairId(): string {
        return typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    }

    getPairRecords(): PairRecord[] {
        return Array.isArray(this.settings.pairRecords) ? this.settings.pairRecords : [];
    }

    getPairRecordById(pairId: string | undefined): PairRecord | null {
        if (!pairId) return null;
        return this.getPairRecords().find(record => record.pairId === pairId) ?? null;
    }

    getPairRecordForImagePath(imagePath: string): PairRecord | null {
        return this.getPairRecords().find(record => record.imagePath === imagePath) ?? null;
    }

    getPairRecordForNotePath(notePath: string): PairRecord | null {
        return this.getPairRecords().find(record => record.notePath === notePath) ?? null;
    }

    getPairRecordForPath(path: string): PairRecord | null {
        return this.getPairRecords().find(record => record.imagePath === path || record.notePath === path) ?? null;
    }

    ensurePairRecordForImage(imagePath: string): PairRecord {
        const existing = this.getPairRecordForImagePath(imagePath);
        if (existing) return existing;
        const now = Date.now();
        const record: PairRecord = { pairId: this.createPairId(), imagePath, createdAt: now, updatedAt: now };
        this.settings.pairRecords = [...this.getPairRecords(), record];
        return record;
    }

    upsertPairRecord(record: PairRecord): void {
        const records = this.getPairRecords().filter(existing => existing.pairId !== record.pairId);
        records.push({ ...record, updatedAt: Date.now() });
        this.settings.pairRecords = records;
    }

    updatePairRecord(pairId: string | undefined, updates: Partial<Omit<PairRecord, "pairId" | "createdAt">>): void {
        const record = this.getPairRecordById(pairId);
        if (!record) return;
        this.upsertPairRecord({ ...record, ...updates });
    }

    isPathOwnedByOtherPair(path: string, pairId: string | undefined): boolean {
        const owner = this.getPairRecordForPath(path);
        return !!owner && !!pairId && owner.pairId !== pairId;
    }

    removePairRecordsForPath(path: string): boolean {
        const records = this.getPairRecords();
        const filtered = records.filter(record => record.imagePath !== path && record.notePath !== path);
        if (filtered.length === records.length) return false;
        this.settings.pairRecords = filtered;
        return true;
    }

    updatePairRecordsForRename(oldPath: string, newPath: string): boolean {
        let changed = false;
        this.settings.pairRecords = this.getPairRecords().map(record => {
            const updated = { ...record };
            if (updated.imagePath === oldPath) {
                updated.imagePath = newPath;
                updated.updatedAt = Date.now();
                changed = true;
            }
            if (updated.notePath === oldPath) {
                updated.notePath = newPath;
                updated.updatedAt = Date.now();
                changed = true;
            }
            return updated;
        });
        return changed;
    }

    backfillPairRecordsFromDuplicateRecords(): void {
        const records = this.getPairRecords();
        let changed = false;
        this.getDuplicateRecords().forEach(duplicate => {
            const existing = records.find(record => record.imagePath === duplicate.filePath || record.notePath === duplicate.notePath);
            if (existing) {
                if (!existing.notePath && duplicate.notePath) {
                    existing.notePath = duplicate.notePath;
                    existing.updatedAt = Date.now();
                    changed = true;
                }
                return;
            }
            records.push({
                pairId: this.createPairId(),
                imagePath: duplicate.filePath,
                notePath: duplicate.notePath,
                createdAt: duplicate.processedAt || Date.now(),
                updatedAt: Date.now(),
            });
            changed = true;
        });
        if (changed) this.settings.pairRecords = records;
    }

    isCurrentRun(path: string, runId: string): boolean {
        return this.currentRunIds.get(path) === runId;
    }

    registerActiveRunPair(runId: string, pairId: string, imagePath: string, expectedNotePath: string): void {
        this.activeRunPairs.set(runId, { runId, pairId, imagePath, expectedNotePath });
    }

    updateActiveRunPair(runId: string, updates: Partial<Omit<ActiveRunPair, "runId">>): void {
        const pair = this.activeRunPairs.get(runId);
        if (!pair) return;
        this.activeRunPairs.set(runId, { ...pair, ...updates });
    }

    getActiveRunPairForPath(path: string): ActiveRunPair | null {
        for (const pair of this.activeRunPairs.values()) {
            if (pair.imagePath === path || pair.expectedNotePath === path || pair.resolvedNotePath === path) return pair;
        }
        return null;
    }

    getLinkedFileFromActiveRunPair(path: string): TFile | null {
        const pair = this.getActiveRunPairForPath(path);
        if (!pair) return null;
        const linkedPath = path === pair.imagePath
            ? pair.resolvedNotePath ?? pair.expectedNotePath
            : pair.imagePath;
        const linked = this.app.vault.getAbstractFileByPath(linkedPath);
        return linked instanceof TFile ? linked : null;
    }

    cleanupActiveRunPairsForPath(path: string, runId?: string): void {
        if (runId) {
            this.activeRunPairs.delete(runId);
            return;
        }
        Array.from(this.activeRunPairs.entries()).forEach(([key, pair]) => {
            if (pair.imagePath === path || pair.expectedNotePath === path || pair.resolvedNotePath === path) {
                this.activeRunPairs.delete(key);
            }
        });
    }

    renameActiveRunPairPath(oldPath: string, newPath: string): void {
        this.activeRunPairs.forEach((pair, runId) => {
            const updated = { ...pair };
            let changed = false;
            if (updated.imagePath === oldPath) {
                updated.imagePath = newPath;
                changed = true;
            }
            if (updated.expectedNotePath === oldPath) {
                updated.expectedNotePath = newPath;
                changed = true;
            }
            if (updated.resolvedNotePath === oldPath) {
                updated.resolvedNotePath = newPath;
                changed = true;
            }
            if (changed) this.activeRunPairs.set(runId, updated);
        });
    }
    registerPendingDuplicateAction(action: PendingDuplicateAction): void {
        this.pendingDuplicateActions.set(action.runId, action);
    }

    updatePendingDuplicateAction(runId: string | undefined, updates: Partial<Omit<PendingDuplicateAction, "runId">>): void {
        if (!runId) return;
        const action = this.pendingDuplicateActions.get(runId);
        if (!action) return;
        this.pendingDuplicateActions.set(runId, { ...action, ...updates });
    }

    clearPendingDuplicateAction(runId?: string): void {
        if (!runId) return;
        this.pendingDuplicateActions.delete(runId);
    }

    doesPendingDuplicateActionUsePath(action: PendingDuplicateAction, path: string): boolean {
        return action.newImagePath === path
            || action.newNotePath === path
            || action.originalImagePath === path
            || action.originalNotePath === path;
    }

    cancelPendingDuplicateActionsForPath(path: string): boolean {
        let changed = false;
        Array.from(this.pendingDuplicateActions.values()).forEach(action => {
            if (!this.doesPendingDuplicateActionUsePath(action, path)) return;
            this.pendingDuplicateActions.delete(action.runId);
            this.processingQueue.delete(action.newImagePath);
            this.currentRunIds.delete(action.newImagePath);
            this.cleanupActiveRunPairsForPath(action.newImagePath, action.runId);
            this.duplicateFingerprintCache.delete(this.getRunCacheKey(action.newImagePath, action.runId));
            this.duplicateHandlingCache.delete(this.getRunCacheKey(action.newImagePath, action.runId));
            this.markDuplicateProcessingComplete(action.newImagePath, action.runId);
            if (this.removeProtectedJob(action.newImagePath)) changed = true;
            changed = true;
            new Notice(`Maru\'s Autotag canceled duplicate action for ${action.newImagePath} because a required file was deleted.`);
        });
        return changed;
    }

    renamePendingDuplicateActionPath(oldPath: string, newPath: string): void {
        this.pendingDuplicateActions.forEach((action, runId) => {
            const updated = { ...action };
            let changed = false;
            if (updated.newImagePath === oldPath) { updated.newImagePath = newPath; changed = true; }
            if (updated.newNotePath === oldPath) { updated.newNotePath = newPath; changed = true; }
            if (updated.originalImagePath === oldPath) { updated.originalImagePath = newPath; changed = true; }
            if (updated.originalNotePath === oldPath) { updated.originalNotePath = newPath; changed = true; }
            if (changed) this.pendingDuplicateActions.set(runId, updated);
        });
    }
    // =========================
    // AI LAYER (PUT HERE)
    // =========================

    getAIImageAnalyzer(): AIImageAnalyzerAPI | undefined {
        return (this.app as any)
            .plugins
            ?.plugins
            ?.["ai-image-analyzer"]
            ?.api;
    }

    async analyzeImageFile(file: TFile): Promise<string | null> {
        const analyzer = this.getAIImageAnalyzer();

        if (!analyzer) {
            new Notice("AI Image Analyzer not found");
            return null;
        }

        try {
            return await analyzer.analyzeImage(file);
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    arrayBufferToHex(buffer: ArrayBuffer): string {
        return Array.from(new Uint8Array(buffer))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    async computeExactHash(file: TFile): Promise<string> {
        const content = await this.app.vault.readBinary(file);
        const digest = await crypto.subtle.digest("SHA-256", content);
        return this.arrayBufferToHex(digest);
    }

    async computeVisualHash(file: TFile): Promise<string | undefined> {
        const image = new Image();
        image.decoding = "async";
        image.src = this.app.vault.getResourcePath(file);
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error(`Could not load image for visual hash: ${file.path}`));
        });

        const canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 8;
        const context = canvas.getContext("2d");
        if (!context) return undefined;

        context.drawImage(image, 0, 0, 8, 8);
        const pixels = context.getImageData(0, 0, 8, 8).data;
        const luminance: number[] = [];
        for (let index = 0; index < pixels.length; index += 4) {
            luminance.push((pixels[index] * 0.299) + (pixels[index + 1] * 0.587) + (pixels[index + 2] * 0.114));
        }
        const average = luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
        return luminance.map(value => value >= average ? "1" : "0").join("");
    }
    getDuplicateFingerprint(file: TFile, runId?: string): Promise<DuplicateFingerprint> {
        const cacheKey = this.getRunCacheKey(file.path, runId);
        const existing = this.duplicateFingerprintCache.get(cacheKey);
        if (existing) return existing;

        const fingerprint = (async () => {
            const exactHash = await this.computeExactHash(file);
            if (runId && !this.isCurrentRun(file.path, runId)) {
                throw new Error("Stale duplicate fingerprint result ignored");
            }
            const visualHash = this.isDuplicateProtectionActive() && this.settings.duplicateDetectionMode === "exact-visual"
                ? await this.computeVisualHash(file).catch(error => { console.warn("Maru\'s Autotag visual duplicate hash failed", error); return undefined; })
                : undefined;
            if (runId && !this.isCurrentRun(file.path, runId)) {
                throw new Error("Stale duplicate fingerprint result ignored");
            }
            return { exactHash, visualHash };
        })();

        this.duplicateFingerprintCache.set(cacheKey, fingerprint);
        fingerprint.catch(() => this.duplicateFingerprintCache.delete(cacheKey));
        return fingerprint;
    }

    startDuplicateFingerprintPrecompute(file: TFile, runId?: string): void {
        if (!this.isDuplicateProtectionActive()) return;
        void this.getDuplicateFingerprint(file, runId).catch(error => {
            if (runId && !this.isCurrentRun(file.path, runId)) return;
            console.warn("Maru\'s Autotag duplicate fingerprint precompute failed", error);
        });
    }

    getVisualHashDistance(left: string, right: string): number {
        const length = Math.min(left.length, right.length);
        let distance = Math.abs(left.length - right.length);
        for (let index = 0; index < length; index++) {
            if (left[index] !== right[index]) distance += 1;
        }
        return distance;
    }

    getVisualSimilarity(distance: number): number {
        return Math.max(0, Math.round(((64 - distance) / 64) * 100));
    }

    getDuplicateRecords(): DuplicateRecord[] {
        return Array.isArray(this.settings.duplicateRecords) ? this.settings.duplicateRecords : [];
    }

    findDuplicateMatch(filePath: string, exactHash: string, visualHash?: string): DuplicateMatch | null {
        const records = this.getDuplicateRecords().filter(record => record.filePath !== filePath);
        const exactMatch = records.find(record => record.exactHash === exactHash);
        if (exactMatch) return { type: "exact", record: exactMatch, similarity: 100, distance: 0 };
        if (!this.isDuplicateProtectionActive() || this.settings.duplicateDetectionMode !== "exact-visual" || !visualHash) return null;

        const visualMatches = records
            .filter(record => record.visualHash)
            .map(record => {
                const distance = this.getVisualHashDistance(visualHash, record.visualHash ?? "");
                return { type: "visual" as const, record, distance, similarity: this.getVisualSimilarity(distance) };
            })
            .filter(match => match.distance <= this.settings.visualDuplicateThreshold)
            .sort((a, b) => a.distance - b.distance);
        return visualMatches[0] ?? null;
    }

    getDuplicateActionForMatch(match: DuplicateMatch): DuplicateAction {
        return match.type === "exact" ? this.settings.exactDuplicateAction : this.settings.visualDuplicateAction;
    }

    upsertDuplicateRecord(record: DuplicateRecord): void {
        const records = this.getDuplicateRecords().filter(existing => existing.filePath !== record.filePath);
        records.push(record);
        this.settings.duplicateRecords = records;
        const pairRecord = this.getPairRecordForImagePath(record.filePath) ?? this.ensurePairRecordForImage(record.filePath);
        this.updatePairRecord(pairRecord.pairId, { notePath: record.notePath });
    }

    removeDuplicateRecordsForPath(path: string): boolean {
        const records = this.getDuplicateRecords();
        const filtered = records.filter(record => record.filePath !== path && record.notePath !== path);
        const pairChanged = this.removePairRecordsForPath(path);
        if (filtered.length === records.length) return pairChanged;
        this.settings.duplicateRecords = filtered;
        return true;
    }

    updateDuplicateRecordsForRename(oldPath: string, newPath: string, newNotePath?: string): boolean {
        let changed = this.updatePairRecordsForRename(oldPath, newPath);
        this.settings.duplicateRecords = this.getDuplicateRecords().map(record => {
            const updated = { ...record };
            if (updated.filePath === oldPath) {
                updated.filePath = newPath;
                if (newNotePath) updated.notePath = newNotePath;
                changed = true;
            }
            if (updated.notePath === oldPath) {
                updated.notePath = newPath;
                changed = true;
            }
            return updated;
        });
        return changed;
    }
    isDuplicateProtectionActive(): boolean {
        return this.settings.useDuplicateProtection && this.settings.duplicateDetectionMode !== "off";
    }

    getUnlinkedDuplicateRecords(): DuplicateRecord[] {
        return this.getDuplicateRecords().filter(record => {
            const image = this.app.vault.getAbstractFileByPath(record.filePath);
            const note = this.app.vault.getAbstractFileByPath(record.notePath);
            return !(image instanceof TFile) || !(note instanceof TFile);
        });
    }

    getHashableBaseFiles(): TFile[] {
        return this.app.vault.getFiles()
            .filter(file => file.path.startsWith(this.settings.basePath))
            .filter(file => file.extension.toLowerCase() !== "md")
            .sort((a, b) => a.path.localeCompare(b.path));
    }

    getLimitedFileTypeWarning(extension: string): LimitedFileTypeWarningDefinition | null {
        const normalizedExtension = extension.replace(/^\./, "").trim().toLowerCase();
        return LIMITED_FILE_TYPE_WARNINGS.find(definition => definition.extension === normalizedExtension) ?? null;
    }

    isLimitedFileTypeWarningSkipped(extension: string): boolean {
        const warning = this.getLimitedFileTypeWarning(extension);
        return warning ? this.settings.limitedFileTypeWarningSkips?.[warning.extension] === true : false;
    }

    async setLimitedFileTypeWarningSkipped(extension: string, skipped: boolean): Promise<void> {
        const warning = this.getLimitedFileTypeWarning(extension);
        if (!warning) return;
        this.settings.limitedFileTypeWarningSkips = {
            ...(this.settings.limitedFileTypeWarningSkips ?? {}),
            [warning.extension]: skipped,
        };
        await this.saveSettings();
    }

    showLimitedFileTypeWarning(file: TFile): void {
        if (file.extension.toLowerCase() === "md") return;
        const warning = this.getLimitedFileTypeWarning(file.extension);
        if (!warning || this.isLimitedFileTypeWarningSkipped(warning.extension)) return;
        if (this.activeLimitedFileTypeWarningExtensions.has(warning.extension)) return;

        this.activeLimitedFileTypeWarningExtensions.add(warning.extension);
        new LimitedFileTypeWarningModal(
            this.app,
            this,
            warning,
            file,
            () => this.activeLimitedFileTypeWarningExtensions.delete(warning.extension)
        ).open();
    }

    getUnhashedFiles(): TFile[] {
        const hashedPaths = new Set(this.getDuplicateRecords().map(record => record.filePath));
        return this.getHashableBaseFiles().filter(file => !hashedPaths.has(file.path));
    }

    getManualPairImageFiles(): TFile[] {
        return this.app.vault.getFiles()
            .filter(file => file.path.startsWith(this.settings.basePath))
            .filter(file => file.extension.toLowerCase() !== "md")
            .sort((a, b) => a.path.localeCompare(b.path));
    }

    getManualPairNoteFiles(): TFile[] {
        return this.app.vault.getFiles()
            .filter(file => file.path.startsWith(this.settings.bfmNewFileLocation))
            .filter(file => file.extension.toLowerCase() === "md")
            .sort((a, b) => a.path.localeCompare(b.path));
    }

    getPairableFiles(): TFile[] {
        return [...this.getManualPairImageFiles(), ...this.getManualPairNoteFiles()]
            .sort((a, b) => a.path.localeCompare(b.path));
    }

    getUnpairedFiles(): TFile[] {
        const pairedPaths = new Set<string>();
        this.getPairRecords().forEach(record => {
            pairedPaths.add(record.imagePath);
            if (record.notePath) pairedPaths.add(record.notePath);
        });
        return this.getPairableFiles().filter(file => !pairedPaths.has(file.path));
    }

    async copyUnpairedFilesToClipboard(): Promise<void> {
        const files = this.getUnpairedFiles();
        const text = files.length > 0
            ? files.map(file => file.path).join("\n")
            : "No unpaired files found.";
        await navigator.clipboard.writeText(text);
        new Notice(files.length > 0 ? `Copied ${files.length} unpaired file path${files.length === 1 ? "" : "s"}.` : "No unpaired file paths to copy.");
    }

    getAffectedFilesReviewFolderPath(folderName: string): string {
        const cleanedName = folderName
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, " ")
            .replace(/\s+/g, " ")
            .trim() || "General";
        return `Maru\'s Autotag Review/${cleanedName}`.replace(/\\/g, "/").replace(/\/+/g, "/");
    }

    getVaultRootFullPath(): string | null {
        const adapter = this.app.vault.adapter;
        const fullAdapter = adapter as unknown as { getBasePath?: () => string; getFullPath?: (path: string) => string };
        if (typeof fullAdapter.getBasePath === "function") {
            return fullAdapter.getBasePath();
        }
        if (adapter instanceof FileSystemAdapter) {
            return adapter.getFullPath("");
        }
        return typeof fullAdapter.getFullPath === "function" ? fullAdapter.getFullPath("") : null;
    }

    async ensureVaultFolderPath(folderPath: string): Promise<string> {
        const normalized = folderPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
        const parts = normalized.split("/").filter(Boolean);
        let current = "";
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            if (!await this.app.vault.adapter.exists(current)) {
                await this.app.vault.adapter.mkdir(current);
            }
        }
        return normalized;
    }

    async showVaultFolderMoveDialog(defaultVaultPath: string, title: string): Promise<string | null | undefined> {
        const fullDefaultPath = this.getFullVaultPath(defaultVaultPath);
        const options = {
            title,
            defaultPath: fullDefaultPath ?? undefined,
            properties: ["openDirectory", "createDirectory"] as string[],
        };
        const openDialog = async (dialog: any, currentWindow?: unknown): Promise<string | null | undefined> => {
            if (!dialog || typeof dialog.showOpenDialog !== "function") return undefined;
            const result = currentWindow
                ? await dialog.showOpenDialog(currentWindow, options)
                : await dialog.showOpenDialog(options);
            if (result?.canceled) return null;
            const selectedPath = Array.isArray(result?.filePaths) ? result.filePaths[0] : undefined;
            return typeof selectedPath === "string" && selectedPath.trim() ? selectedPath : null;
        };

        try {
            const electron = require("electron") as any;
            const remoteResult = await openDialog(electron.remote?.dialog, electron.remote?.getCurrentWindow?.());
            if (remoteResult !== undefined) return remoteResult;
            const directResult = await openDialog(electron.dialog);
            if (directResult !== undefined) return directResult;
        } catch (error) {
            console.warn("Maru\'s Autotag move-folder dialog unavailable", error);
        }

        return undefined;
    }

    getVaultRelativePathFromFullPath(fullPath: string): string | null {
        const vaultRoot = this.getVaultRootFullPath();
        if (!vaultRoot) return null;
        const path = require("path") as typeof import("path");
        const relative = path.relative(vaultRoot, fullPath);
        if (!relative || relative === ".") return "";
        if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
        return relative.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
    }

    getExistingFilesFromPaths(paths: string[]): TFile[] {
        const seen = new Set<string>();
        const files: TFile[] = [];
        paths.forEach(path => {
            if (!path || seen.has(path)) return;
            seen.add(path);
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) files.push(file);
        });
        return files.sort((a, b) => a.path.localeCompare(b.path));
    }

    getUnlinkedHashAffectedFiles(): TFile[] {
        const paths = this.getUnlinkedDuplicateRecords().flatMap(record => [record.filePath, record.notePath]);
        return this.getExistingFilesFromPaths(paths);
    }

    getFailedProcessingFiles(): TFile[] {
        return this.getExistingFilesFromPaths(this.settings.failedFiles.map(file => file.path));
    }

    getQueuedGeolocationFiles(): TFile[] {
        return this.getExistingFilesFromPaths(this.settings.pendingGeocodeJobs.flatMap(job => [job.imagePath, job.notePath]));
    }

    async getAvailableMovePath(targetFolder: string, file: TFile): Promise<string> {
        const normalizedFolder = targetFolder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
        const makePath = (name: string) => normalizedFolder ? `${normalizedFolder}/${name}` : name;
        const firstPath = makePath(file.name);
        if (firstPath === file.path) return firstPath;
        if (!await this.app.vault.adapter.exists(firstPath)) return firstPath;

        const dotIndex = file.name.lastIndexOf(".");
        const stem = dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name;
        const extension = dotIndex > 0 ? file.name.slice(dotIndex) : "";
        let index = 2;
        while (true) {
            const candidate = makePath(`${stem} ${index}${extension}`);
            if (candidate === file.path || !await this.app.vault.adapter.exists(candidate)) return candidate;
            index += 1;
        }
    }

    updateInternalReferencesForMovedFile(oldPath: string, newPath: string, file: TFile): boolean {
        let changed = false;
        const failedFile = this.getFailedFile(oldPath);
        if (failedFile) {
            failedFile.path = newPath;
            changed = true;
        }
        const renamedImageNotePath = file.extension.toLowerCase() === "md" ? undefined : this.getBfmNotePath(file);
        if (this.updateDuplicateRecordsForRename(oldPath, newPath, renamedImageNotePath)) changed = true;
        if (this.updateProtectedJobPath(oldPath, newPath, renamedImageNotePath)) changed = true;
        if (this.updatePendingGeocodeJobsForRename(oldPath, newPath)) changed = true;
        const processedIndex = this.settings.processedFiles.indexOf(oldPath);
        if (processedIndex !== -1) {
            this.settings.processedFiles.splice(processedIndex, 1, newPath);
            changed = true;
        }
        return changed;
    }

    async moveAffectedFilesToChosenFolder(files: TFile[], label: string, defaultFolderName: string): Promise<void> {
        const uniqueFiles = this.getExistingFilesFromPaths(files.map(file => file.path));
        if (uniqueFiles.length === 0) {
            new Notice(`No ${label} to move.`);
            return;
        }

        const defaultFolderPath = await this.ensureVaultFolderPath(this.getAffectedFilesReviewFolderPath(defaultFolderName));
        const selectedFullPath = await this.showVaultFolderMoveDialog(defaultFolderPath, `Move ${label}`);
        if (selectedFullPath === null) {
            new Notice("Move canceled.");
            return;
        }
        if (!selectedFullPath) {
            new Notice("Could not open a folder picker for moving affected files.");
            return;
        }

        const targetFolder = this.getVaultRelativePathFromFullPath(selectedFullPath);
        if (targetFolder === null) {
            new Notice("Choose a folder inside this vault so Obsidian can keep file links and plugin records updated.");
            return;
        }
        await this.ensureVaultFolderPath(targetFolder);

        let moved = 0;
        let skippedProcessing = 0;
        let skippedAlreadyThere = 0;
        let failed = 0;
        let changed = false;
        const progress = this.showProgressNotice(
            `Moving ${label}`,
            `Moving 0/${uniqueFiles.length}`,
            Math.max(1, uniqueFiles.length)
        );

        for (let index = 0; index < uniqueFiles.length; index += 1) {
            const originalFile = uniqueFiles[index];
            const currentFile = this.app.vault.getAbstractFileByPath(originalFile.path);
            if (!(currentFile instanceof TFile)) {
                failed += 1;
                progress.setProgress(index + 1, `Moving ${index + 1}/${uniqueFiles.length}`);
                continue;
            }
            if (this.isPathProcessing(currentFile.path)) {
                skippedProcessing += 1;
                progress.setProgress(index + 1, `Moving ${index + 1}/${uniqueFiles.length}`);
                continue;
            }

            const oldPath = currentFile.path;
            const targetPath = await this.getAvailableMovePath(targetFolder, currentFile);
            if (targetPath === oldPath) {
                skippedAlreadyThere += 1;
                progress.setProgress(index + 1, `Moving ${index + 1}/${uniqueFiles.length}`);
                continue;
            }

            try {
                await this.app.vault.rename(currentFile, targetPath);
                const movedFile = this.app.vault.getAbstractFileByPath(targetPath);
                if (movedFile instanceof TFile && this.updateInternalReferencesForMovedFile(oldPath, targetPath, movedFile)) {
                    changed = true;
                }
                moved += 1;
            } catch (error) {
                failed += 1;
                console.warn("Maru\'s Autotag could not move affected file", oldPath, targetPath, error);
            }
            progress.setProgress(index + 1, `Moving ${index + 1}/${uniqueFiles.length}`);
            if ((index + 1) % 20 === 0) await this.sleep(1);
        }

        if (changed) await this.saveSettings();
        const summary = `Moved ${moved}/${uniqueFiles.length} ${label}${skippedProcessing > 0 ? `; ${skippedProcessing} skipped while processing` : ""}${skippedAlreadyThere > 0 ? `; ${skippedAlreadyThere} already in target` : ""}${failed > 0 ? `; ${failed} failed` : ""}.`;
        progress.setProgress(uniqueFiles.length, summary);
        window.setTimeout(() => progress.hide(), 2200);
        new Notice(summary);
    }

    async deleteUnpairedFiles(): Promise<void> {
        const files = this.getUnpairedFiles();
        if (files.length === 0) {
            new Notice("No unpaired files to delete.");
            return;
        }

        let deleted = 0;
        let failed = 0;
        let changed = false;
        for (const file of files) {
            const currentFile = this.app.vault.getAbstractFileByPath(file.path);
            if (!(currentFile instanceof TFile)) {
                if (this.cleanupProcessingStateForPath(file.path)) changed = true;
                continue;
            }
            try {
                await this.deleteFileWithoutLinkedCascade(currentFile);
                if (this.cleanupProcessingStateForPath(file.path)) changed = true;
                deleted += 1;
            } catch (error) {
                failed += 1;
                console.warn("Maru\'s Autotag could not delete unpaired file", file.path, error);
            }
        }
        if (changed) await this.saveSettings();
        new Notice(`Deleted ${deleted} unpaired file${deleted === 1 ? "" : "s"}${failed > 0 ? `; ${failed} failed` : ""}.`);
    }

    isPathProcessing(path: string): boolean {
        if (this.currentRunIds.has(path) || this.processingQueue.has(path)) return true;
        if (this.getActiveRunPairForPath(path)) return true;
        for (const action of this.pendingDuplicateActions.values()) {
            if (!action.processingComplete && this.doesPendingDuplicateActionUsePath(action, path)) return true;
        }
        return false;
    }

    isPathActivelyProcessing(path: string): boolean {
        return this.currentRunIds.has(path)
            || this.processingQueue.has(path)
            || !!this.getActiveRunPairForPath(path);
    }

    isManualPairActionProcessing(action: PendingManualPairAction): boolean {
        return this.isPathProcessing(action.imagePath) || this.isPathProcessing(action.notePath);
    }

    queueManualPairFiles(imagePath: string, notePath: string): void {
        this.pendingManualPairActions.set(`${imagePath}\n${notePath}`, { imagePath, notePath });
    }

    async drainPendingManualPairActions(): Promise<void> {
        const ready = Array.from(this.pendingManualPairActions.entries())
            .filter(([, action]) => !this.isManualPairActionProcessing(action));
        for (const [key, action] of ready) {
            this.pendingManualPairActions.delete(key);
            await this.manualPairFilesImmediate(action.imagePath, action.notePath);
        }
    }

    async manualPairFiles(imagePath: string, notePath: string): Promise<void> {
        const image = this.app.vault.getAbstractFileByPath(imagePath);
        const note = this.app.vault.getAbstractFileByPath(notePath);
        if (!(image instanceof TFile) || !(note instanceof TFile)) {
            new Notice("Manual pairing needs two existing files.");
            return;
        }
        if (!image.path.startsWith(this.settings.basePath) || image.extension.toLowerCase() === "md") {
            new Notice("Manual pairing image/source must be a non-markdown file inside the Base Path.");
            return;
        }
        if (!note.path.startsWith(this.settings.bfmNewFileLocation) || note.extension.toLowerCase() !== "md") {
            new Notice("Manual pairing companion must be a markdown note inside the BFM New File Location.");
            return;
        }
        const isProcessing = this.isPathProcessing(image.path) || this.isPathProcessing(note.path);
        const confirmed = await this.confirmManualPairFiles(image, note, isProcessing);
        if (!confirmed) return;

        if (isProcessing) {
            this.queueManualPairFiles(image.path, note.path);
            new Notice("Manual pair queued. The pair will be updated after processing finishes.");
            return;
        }
        await this.manualPairFilesImmediate(image.path, note.path);
    }

    async confirmManualPairFiles(image: TFile, note: TFile, willQueue: boolean): Promise<boolean> {
        return new Promise(resolve => {
            new ManualPairConfirmationModal(this.app, this, image, note, willQueue, resolve).open();
        });
    }

    async manualPairFilesImmediate(imagePath: string, notePath: string, showNotice = true, saveAfterPairing = true): Promise<void> {
        const image = this.app.vault.getAbstractFileByPath(imagePath);
        const note = this.app.vault.getAbstractFileByPath(notePath);
        if (!(image instanceof TFile) || !(note instanceof TFile)) {
            new Notice("Manual pairing needs two existing files.");
            return;
        }
        if (!image.path.startsWith(this.settings.basePath) || image.extension.toLowerCase() === "md") {
            new Notice("Manual pairing image/source must be a non-markdown file inside the Base Path.");
            return;
        }
        if (!note.path.startsWith(this.settings.bfmNewFileLocation) || note.extension.toLowerCase() !== "md") {
            new Notice("Manual pairing companion must be a markdown note inside the BFM New File Location.");
            return;
        }

        const imagePair = this.getPairRecordForPath(image.path);
        const notePair = this.getPairRecordForPath(note.path);
        const now = Date.now();
        const pairId = imagePair?.pairId ?? notePair?.pairId ?? this.createPairId();
        const createdAt = imagePair?.createdAt ?? notePair?.createdAt ?? now;
        this.settings.pairRecords = this.getPairRecords().filter(record =>
            record.pairId !== pairId
            && record.pairId !== imagePair?.pairId
            && record.pairId !== notePair?.pairId
            && record.imagePath !== image.path
            && record.notePath !== image.path
            && record.imagePath !== note.path
            && record.notePath !== note.path
        );
        this.settings.pairRecords.push({
            pairId,
            imagePath: image.path,
            notePath: note.path,
            createdAt,
            updatedAt: now,
        });

        const imageRecord = this.getDuplicateRecords().find(record => record.filePath === image.path);
        this.settings.duplicateRecords = this.getDuplicateRecords()
            .filter(record => record.filePath !== image.path && record.notePath !== note.path);
        if (imageRecord) {
            this.settings.duplicateRecords.push({ ...imageRecord, filePath: image.path, notePath: note.path });
        }
        if (saveAfterPairing) await this.saveSettings();
        if (showNotice) new Notice(`Paired files with Pair ID ${pairId}.`);
    }

    async regenerateDuplicateHashes(): Promise<void> {
        if (!this.settings.useDuplicateProtection) {
            new Notice("Duplicate Protection is turned off.");
            return;
        }

        const files = this.getHashableBaseFiles();
        const records: DuplicateRecord[] = [];
        let failed = 0;
        for (const file of files) {
            try {
                const exactHash = await this.computeExactHash(file);
                const visualHash = this.isDuplicateProtectionActive() && this.settings.duplicateDetectionMode === "exact-visual"
                    ? await this.computeVisualHash(file).catch(() => undefined)
                    : undefined;
                records.push({
                    filePath: file.path,
                    notePath: this.getBfmNotePath(file),
                    exactHash,
                    visualHash,
                    processedAt: Date.now(),
                });
            } catch (error) {
                failed += 1;
                console.warn("Maru\'s Autotag could not regenerate duplicate hash", file.path, error);
            }
        }

        this.settings.duplicateRecords = records;
        await this.saveSettings();
        new Notice(`Regenerated duplicate hashes for ${records.length} file${records.length === 1 ? "" : "s"}${failed > 0 ? `; ${failed} failed` : ""}.`);
    }

    async copyUnhashedFilesToClipboard(): Promise<void> {
        const files = this.getUnhashedFiles();
        const text = files.length > 0
            ? files.map(file => file.path).join("\n")
            : "No unhashed files found.";
        await navigator.clipboard.writeText(text);
        new Notice(files.length > 0 ? `Copied ${files.length} unhashed file path${files.length === 1 ? "" : "s"}.` : "No unhashed file paths to copy.");
    }

    async copyUnlinkedHashesToClipboard(): Promise<void> {
        const records = this.getUnlinkedDuplicateRecords();
        const text = records.length > 0
            ? records.map(record => `Image: ${record.filePath}\nCompanion: ${record.notePath}\nHash: ${record.exactHash}`).join("\n\n")
            : "No unlinked duplicate hashes found.";
        await navigator.clipboard.writeText(text);
        new Notice(records.length > 0 ? `Copied ${records.length} unlinked hash record${records.length === 1 ? "" : "s"}.` : "No unlinked hashes to copy.");
    }

    async deleteFailedFiles(): Promise<void> {
        const failedFiles = [...this.settings.failedFiles];
        if (failedFiles.length === 0) {
            new Notice("No failed files to delete.");
            return;
        }

        let deleted = 0;
        let missing = 0;
        let failed = 0;
        let changed = false;
        for (const failedFile of failedFiles) {
            const file = this.app.vault.getAbstractFileByPath(failedFile.path);
            if (!(file instanceof TFile)) {
                if (this.cleanupProcessingStateForPath(failedFile.path)) changed = true;
                missing += 1;
                continue;
            }
            try {
                await this.deleteFileWithoutLinkedCascade(file);
                if (this.cleanupProcessingStateForPath(failedFile.path)) changed = true;
                deleted += 1;
            } catch (error) {
                failed += 1;
                console.warn("Maru\'s Autotag could not delete failed file", failedFile.path, error);
            }
        }
        if (changed) await this.saveSettings();
        new Notice(`Deleted ${deleted} failed file${deleted === 1 ? "" : "s"}${missing > 0 ? `; ${missing} already missing` : ""}${failed > 0 ? `; ${failed} failed` : ""}.`);
    }

    async deleteUnlinkedHashes(): Promise<void> {
        const before = this.getDuplicateRecords();
        const unlinked = new Set(this.getUnlinkedDuplicateRecords().map(record => `${record.filePath}\n${record.notePath}`));
        this.settings.duplicateRecords = before.filter(record => !unlinked.has(`${record.filePath}\n${record.notePath}`));
        await this.saveSettings();
        new Notice(`Deleted ${unlinked.size} unlinked duplicate hash${unlinked.size === 1 ? "" : "es"}.`);
    }

    cleanupProcessingStateForPath(path: string, runId?: string): boolean {
        if (runId && !this.isCurrentRun(path, runId)) {
            const cacheKey = this.getRunCacheKey(path, runId);
            this.duplicateFingerprintCache.delete(cacheKey);
            this.duplicateHandlingCache.delete(cacheKey);
            this.markDuplicateProcessingComplete(path, runId);
            return false;
        }

        this.cleanupActiveRunPairsForPath(path, runId);
        this.clearPendingDuplicateAction(runId);
        let changed = false;
        this.processingQueue.delete(path);
        this.activeWorkerPaths.delete(path);
        this.currentRunIds.delete(path);
        this.duplicateFingerprintCache.delete(path);
        if (runId) this.duplicateFingerprintCache.delete(this.getRunCacheKey(path, runId));
        this.duplicateHandlingCache.delete(path);
        if (runId) this.duplicateHandlingCache.delete(this.getRunCacheKey(path, runId));
        this.markDuplicateProcessingComplete(path, runId);
        if (this.clearFailedFile(path)) changed = true;
        if (this.removeDuplicateRecordsForPath(path)) changed = true;
        if (this.removeProtectedJob(path)) changed = true;
        const beforeGeocodeJobs = this.settings.pendingGeocodeJobs.length;
        this.settings.pendingGeocodeJobs = this.settings.pendingGeocodeJobs.filter(job => job.imagePath !== path && job.notePath !== path);
        if (this.settings.pendingGeocodeJobs.length !== beforeGeocodeJobs) changed = true;
        const index = this.settings.processedFiles.indexOf(path);
        if (index !== -1) {
            this.settings.processedFiles.splice(index, 1);
            changed = true;
        }
        return changed;
    }

    findSourceFileForCompanionNote(notePath: string): TFile | null {
        const activeLinked = this.getLinkedFileFromActiveRunPair(notePath);
        if (activeLinked instanceof TFile) return activeLinked;
        const pairRecord = this.getPairRecordForNotePath(notePath);
        const pairImage = pairRecord ? this.app.vault.getAbstractFileByPath(pairRecord.imagePath) : null;
        if (pairImage instanceof TFile) return pairImage;
        const record = this.getDuplicateRecords().find(item => item.notePath === notePath);
        if (record) {
            const file = this.app.vault.getAbstractFileByPath(record.filePath);
            if (file instanceof TFile) return file;
        }

        const job = this.settings.protectedJobs.find(item => item.notePath === notePath);
        if (job) {
            const file = this.app.vault.getAbstractFileByPath(job.path);
            if (file instanceof TFile) return file;
        }

        const note = this.app.vault.getAbstractFileByPath(notePath);
        const cache = note instanceof TFile ? this.app.metadataCache.getFileCache(note) : null;
        const frontmatter = cache?.frontmatter as Record<string, unknown> | undefined;
        const linkProperty = this.getLinkToFilePropertyName();
        const linkedPath = typeof frontmatter?.[linkProperty] === "string"
            ? this.extractPathFromWikiLink(frontmatter[linkProperty] as string)
            : null;
        if (linkedPath) {
            const linkedFile = this.app.vault.getAbstractFileByPath(linkedPath);
            if (linkedFile instanceof TFile) return linkedFile;
        }

        return this.getHashableBaseFiles().find(file => this.doesBfmNotePathMatchFile(notePath, file)) ?? null;
    }
    findCompanionNoteForSourceFile(file: TFile): TFile | null {
        const activeLinked = this.getLinkedFileFromActiveRunPair(file.path);
        if (activeLinked instanceof TFile) return activeLinked;
        const pairRecord = this.getPairRecordForImagePath(file.path);
        const pairNote = pairRecord?.notePath ? this.app.vault.getAbstractFileByPath(pairRecord.notePath) : null;
        if (pairNote instanceof TFile) return pairNote;
        const record = this.getDuplicateRecords().find(item => item.filePath === file.path);
        const recordNote = record ? this.app.vault.getAbstractFileByPath(record.notePath) : null;
        if (recordNote instanceof TFile) return recordNote;

        const job = this.settings.protectedJobs.find(item => item.path === file.path && item.notePath);
        const jobNote = job?.notePath ? this.app.vault.getAbstractFileByPath(job.notePath) : null;
        if (jobNote instanceof TFile) return jobNote;

        return this.findBfmNoteVariant(file);
    }

    getLinkedFileForDeletion(file: TFile): TFile | null {
        return file.path.startsWith(this.settings.basePath)
            ? this.findCompanionNoteForSourceFile(file)
            : file.path.startsWith(this.settings.bfmNewFileLocation)
                ? this.findSourceFileForCompanionNote(file.path)
                : null;
    }

    getFileContext(file: TFile): BfmAutotagFileContext {
        const isWatchedSource = file.extension.toLowerCase() !== "md" && file.path.startsWith(this.settings.basePath);
        const isCompanionNote = file.extension.toLowerCase() === "md" && file.path.startsWith(this.settings.bfmNewFileLocation);
        const directPair = this.getPairRecordForPath(file.path);
        let sourceFile: TFile | null = isWatchedSource ? file : null;
        let companionNote: TFile | null = isCompanionNote ? file : null;

        if (!sourceFile && isCompanionNote) {
            sourceFile = this.findSourceFileForCompanionNote(file.path);
        }
        if (!companionNote && isWatchedSource) {
            companionNote = this.findCompanionNoteForSourceFile(file);
        }
        if (!sourceFile && directPair?.imagePath) {
            const resolved = this.app.vault.getAbstractFileByPath(directPair.imagePath);
            if (resolved instanceof TFile) sourceFile = resolved;
        }
        if (!companionNote && directPair?.notePath) {
            const resolved = this.app.vault.getAbstractFileByPath(directPair.notePath);
            if (resolved instanceof TFile) companionNote = resolved;
        }

        const pairRecord = directPair
            ?? (sourceFile ? this.getPairRecordForImagePath(sourceFile.path) : null)
            ?? (companionNote ? this.getPairRecordForNotePath(companionNote.path) : null);

        return {
            selectedFile: file,
            isWatchedSource,
            isCompanionNote,
            sourceFile,
            companionNote,
            pairRecord,
            sourcePath: sourceFile?.path ?? pairRecord?.imagePath ?? (isWatchedSource ? file.path : undefined),
            companionPath: companionNote?.path ?? pairRecord?.notePath ?? (isCompanionNote ? file.path : undefined),
        };
    }

    openSettingsSection(sectionId = "health"): void {
        const appSettings = (this.app as any).setting;
        if (!appSettings || typeof appSettings.open !== "function") {
            new Notice("Could not open Obsidian settings from the context menu.");
            return;
        }
        appSettings.open();
        if (typeof appSettings.openTabById === "function") {
            appSettings.openTabById(this.manifest.id);
        }
        window.setTimeout(() => this.settingTab?.openSection(sectionId), 0);
    }

    createBfmAutotagContextMenuTitle(title: string, className: string): DocumentFragment {
        const fragment = document.createDocumentFragment();
        const titleEl = document.createElement("span");
        titleEl.classList.add(className);
        titleEl.textContent = title;
        fragment.appendChild(titleEl);
        return fragment;
    }

    addBfmAutotagMenuLabel(menu: Menu, title: string, icon: string): void {
        menu.addItem(item => item
            .setTitle(this.createBfmAutotagContextMenuTitle(title, "bfm-autotag-context-menu-heading"))
            .setIcon(icon)
            .setIsLabel(true));
    }

    addBfmAutotagMenuItem(
        menu: Menu,
        title: string,
        icon: string,
        disabled: boolean,
        onClick: () => void | Promise<void>,
        warning = false
    ): void {
        menu.addItem(item => {
            item
                .setTitle(this.createBfmAutotagContextMenuTitle(title, "bfm-autotag-context-menu-action"))
                .setIcon(icon)
                .setDisabled(disabled)
                .setWarning(warning)
                .onClick(() => {
                    if (!disabled) void onClick();
                });
        });
    }

    async copyContextValueToClipboard(value: string | undefined, successNotice: string, emptyNotice: string): Promise<void> {
        if (!value) {
            new Notice(emptyNotice);
            return;
        }
        await navigator.clipboard.writeText(value);
        new Notice(successNotice);
    }

    async openContextFile(file: TFile | null, emptyNotice: string): Promise<void> {
        if (!(file instanceof TFile)) {
            new Notice(emptyNotice);
            return;
        }
        await this.app.workspace.getLeaf(false).openFile(file);
    }

    showContextPairInfo(file: TFile): void {
        const context = this.getFileContext(file);
        if (!context.pairRecord) {
            new Notice("No duplicate pair record found for this file.");
            return;
        }
        new Notice([
            `Pair ID: ${context.pairRecord.pairId}`,
            `Image: ${context.sourcePath ?? "not resolved"}`,
            `Companion: ${context.companionPath ?? "not resolved"}`,
        ].join("\n"), 12000);
    }

    async forgetProcessedStateForContext(file: TFile): Promise<void> {
        const context = this.getFileContext(file);
        const sourcePath = context.sourcePath;
        if (!sourcePath) {
            new Notice("No source file path found for this Maru\'s Autotag item.");
            return;
        }
        const before = this.settings.processedFiles.length;
        this.settings.processedFiles = this.settings.processedFiles.filter(path => path !== sourcePath);
        if (this.settings.processedFiles.length === before) {
            new Notice("No processed state was stored for this file.");
            return;
        }
        await this.saveSettings();
        new Notice("Forgot processed state for this file.");
    }

    async clearFailedStateForContext(file: TFile): Promise<void> {
        const context = this.getFileContext(file);
        const paths = [context.sourcePath, context.companionPath, file.path].filter((path): path is string => !!path);
        let changed = false;
        paths.forEach(path => {
            if (this.clearFailedFile(path)) changed = true;
        });
        if (!changed) {
            new Notice("No failed state was stored for this file.");
            return;
        }
        await this.saveSettings();
        new Notice("Cleared failed state for this file.");
    }

    async reprocessFileFromContext(file: TFile): Promise<void> {
        const context = this.getFileContext(file);
        if (context.isCompanionNote) {
            await this.processCompanionNoteAgain(file.path);
            return;
        }
        if (context.sourceFile instanceof TFile) {
            await this.processSingleFileAgain(context.sourceFile.path);
            return;
        }
        new Notice("Select a watched source file or companion note to reprocess.");
    }

    async createMissingCompanionFromContext(file: TFile): Promise<void> {
        const context = this.getFileContext(file);
        if (!(context.sourceFile instanceof TFile)) {
            new Notice("Select an image/source file inside the Base Path.");
            return;
        }
        await this.createCompanionNoteForSourceFile(context.sourceFile.path);
    }

    deleteLinkedPairFromContext(file: TFile): void {
        const context = this.getFileContext(file);
        if (!(context.sourceFile instanceof TFile) || !(context.companionNote instanceof TFile)) {
            new Notice("A linked image/note pair was not found for this file.");
            return;
        }
        new ConfirmDestructiveActionModal(
            this.app,
            "Delete linked image/note pair?",
            `This deletes both files without chasing any other linked-pair cascade:\n${context.sourceFile.path}\n${context.companionNote.path}`,
            "Delete Pair",
            async () => {
                const sourcePath = context.sourceFile!.path;
                const companionPath = context.companionNote!.path;
                await this.deleteFileWithoutLinkedCascade(context.companionNote);
                await this.deleteFileWithoutLinkedCascade(context.sourceFile);
                let changed = this.cleanupProcessingStateForPath(sourcePath);
                changed = this.cleanupProcessingStateForPath(companionPath) || changed;
                if (changed) await this.saveSettings();
                new Notice("Deleted linked image/note pair.");
            }
        ).open();
    }

    populateBfmAutotagFileSubmenu(menu: Menu, file: TFile): void {
        menu.setUseNativeMenu(false);
        const context = this.getFileContext(file);
        const hasManagedContext = context.isWatchedSource || context.isCompanionNote || !!context.pairRecord;
        const hasPair = !!context.pairRecord;
        const hasSourceFile = context.sourceFile instanceof TFile;
        const hasCompanionNote = context.companionNote instanceof TFile;

        this.addBfmAutotagMenuLabel(menu, "Health", "activity");
        this.addBfmAutotagMenuItem(menu, "Open Health", "activity", false, () => this.openSettingsSection("health"));
        menu.addSeparator();

        this.addBfmAutotagMenuLabel(menu, "Setup", "wrench");
        this.addBfmAutotagMenuItem(menu, "Open Maru\'s Autotag Settings", "settings", false, () => this.openSettingsSection("setup"));
        menu.addSeparator();

        this.addBfmAutotagMenuLabel(menu, "Processing & Queue", "list-checks");
        this.addBfmAutotagMenuItem(menu, "Reprocess with Maru\'s Autotag", "refresh-cw", !hasSourceFile && !context.isCompanionNote, () => this.reprocessFileFromContext(file));
        menu.addSeparator();

        this.addBfmAutotagMenuLabel(menu, "Duplicates", "copy-check");
        this.addBfmAutotagMenuItem(menu, "Find duplicate pair", "search-check", !hasPair, () => this.showContextPairInfo(file));
        this.addBfmAutotagMenuItem(menu, "Copy pair ID", "fingerprint", !context.pairRecord?.pairId, () => this.copyContextValueToClipboard(context.pairRecord?.pairId, "Pair ID copied.", "No pair ID found for this file."));
        this.addBfmAutotagMenuItem(menu, "Copy image path", "image", !context.sourcePath, () => this.copyContextValueToClipboard(context.sourcePath, "Image path copied.", "No image path found for this file."));
        this.addBfmAutotagMenuItem(menu, "Copy companion path", "file-text", !context.companionPath, () => this.copyContextValueToClipboard(context.companionPath, "Companion path copied.", "No companion path found for this file."));
        this.addBfmAutotagMenuItem(menu, "Open Duplicates settings", "copy-check", false, () => this.openSettingsSection("duplicates"));
        menu.addSeparator();

        this.addBfmAutotagMenuLabel(menu, "Fix / Recover", "wrench");
        this.addBfmAutotagMenuItem(menu, "Forget processed state", "eraser", !context.sourcePath, () => this.forgetProcessedStateForContext(file));
        this.addBfmAutotagMenuItem(menu, "Clear failed state", "circle-x", !hasManagedContext, () => this.clearFailedStateForContext(file));
        this.addBfmAutotagMenuItem(menu, "Create missing companion note", "file-plus", !hasSourceFile, () => this.createMissingCompanionFromContext(file));
        this.addBfmAutotagMenuItem(menu, "Open Fix / Recover settings", "wrench", false, () => this.openSettingsSection("fix-recover"));
        menu.addSeparator();

        this.addBfmAutotagMenuLabel(menu, "QoL", "sliders-horizontal");
        this.addBfmAutotagMenuItem(menu, "Open companion note", "file-text", !hasCompanionNote, () => this.openContextFile(context.companionNote, "No companion note found for this file."));
        this.addBfmAutotagMenuItem(menu, "Open source image", "image", !hasSourceFile, () => this.openContextFile(context.sourceFile, "No source image found for this file."));
        this.addBfmAutotagMenuItem(menu, "Move selected file", "folder-input", this.isPathProcessing(file.path), () => this.moveAffectedFilesToChosenFolder([file], "selected file", "Context Menu"));
        this.addBfmAutotagMenuItem(menu, "Delete linked pair", "trash-2", !hasSourceFile || !hasCompanionNote, () => this.deleteLinkedPairFromContext(file), true);
    }

    addBfmAutotagFileContextMenu(menu: Menu, file: TFile): void {
        menu.addSeparator();
        menu.addItem(item => {
            item
                .setTitle("Maru\'s Autotag")
                .setIcon("sparkles");
            const menuItem = item as unknown as {
                setSubmenu?: (submenu?: Menu) => Menu | void;
            };
            if (typeof menuItem.setSubmenu === "function") {
                try {
                    const nativeSubmenu = menuItem.setSubmenu();
                    if (nativeSubmenu instanceof Menu) {
                        this.populateBfmAutotagFileSubmenu(nativeSubmenu, file);
                        return;
                    }
                } catch (_) {
                    // Fall through to the alternate submenu shape below.
                }
                try {
                    const submenu = new Menu();
                    submenu.setUseNativeMenu(false);
                    this.populateBfmAutotagFileSubmenu(submenu, file);
                    menuItem.setSubmenu(submenu);
                    return;
                } catch (_) {
                    // Fall through to click-open fallback.
                }
            }
            item.onClick(event => {
                const submenu = new Menu();
                submenu.setUseNativeMenu(false);
                this.populateBfmAutotagFileSubmenu(submenu, file);
                submenu.showAtMouseEvent(event as MouseEvent);
            });
        });
    }

    resolveEditorEmbedFile(editor: Editor, info: MarkdownFileInfo): TFile | null {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const embedPattern = /!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
        let fallbackLinkPath = "";
        let match: RegExpExecArray | null;
        while ((match = embedPattern.exec(line)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            if (cursor.ch >= start && cursor.ch <= end) {
                fallbackLinkPath = match[1].trim();
                break;
            }
            if (!fallbackLinkPath) fallbackLinkPath = match[1].trim();
        }
        if (!fallbackLinkPath) return null;
        return this.app.metadataCache.getFirstLinkpathDest(fallbackLinkPath, info.file?.path ?? "") ?? null;
    }

    suppressDeletedPath(path: string, runId: string | null = this.currentRunIds.get(path) ?? null): void {
        this.deletionSuppressedPaths.add(path);
        this.deletionSuppressedRunIds.set(path, runId);
    }

    isDeletionSuppressed(path: string, runId?: string): boolean {
        if (!this.deletionSuppressedPaths.has(path)) return false;
        if (!runId) return true;
        const suppressedRunId = this.deletionSuppressedRunIds.get(path);
        return !suppressedRunId || suppressedRunId === runId;
    }

    clearDeletionSuppression(path: string): void {
        this.deletionSuppressedPaths.delete(path);
        this.deletionSuppressedRunIds.delete(path);
    }

    suppressDeletedPair(file: TFile, linkedFile: TFile | null): void {
        const activePair = this.getActiveRunPairForPath(file.path) ?? (linkedFile instanceof TFile ? this.getActiveRunPairForPath(linkedFile.path) : null);
        const runId = activePair?.runId ?? this.currentRunIds.get(file.path) ?? null;
        this.suppressDeletedPath(file.path, runId);
        if (linkedFile instanceof TFile) this.suppressDeletedPath(linkedFile.path, runId);
    }


    async deleteLinkedCompanionOrSource(file: TFile, linkedFile: TFile | null = this.getLinkedFileForDeletion(file)): Promise<void> {
        if (this.deletionCascadePaths.has(file.path)) return;
        if (!(linkedFile instanceof TFile)) return;
        const linkedPath = linkedFile.path;
        if (!(this.app.vault.getAbstractFileByPath(linkedPath) instanceof TFile)) return;

        this.deletionCascadePaths.add(linkedPath);
        const activePair = this.getActiveRunPairForPath(file.path) ?? this.getActiveRunPairForPath(linkedPath);
        this.suppressDeletedPath(linkedPath, activePair?.runId ?? null);
        try {
            await this.app.vault.delete(linkedFile);
            new Notice(`Maru\'s Autotag deleted linked file: ${linkedPath}`);
        } finally {
            window.setTimeout(() => this.deletionCascadePaths.delete(linkedPath), 1000);
            window.setTimeout(() => this.clearDeletionSuppression(linkedPath), 5000);
        }
    }
    ensureDuplicateProcessingCompletion(filePath: string, runId?: string): Promise<void> {
        const key = this.getRunCacheKey(filePath, runId);
        const existing = this.duplicateProcessingCompletion.get(key);
        if (existing) return existing;

        let resolver: () => void = () => undefined;
        const completion = new Promise<void>(resolve => { resolver = resolve; });
        this.duplicateProcessingCompletion.set(key, completion);
        this.duplicateProcessingCompletionResolvers.set(key, resolver);
        return completion;
    }

    markDuplicateProcessingComplete(filePath: string, runId?: string): void {
        const key = this.getRunCacheKey(filePath, runId);
        const resolver = this.duplicateProcessingCompletionResolvers.get(key);
        if (resolver) resolver();
        this.duplicateProcessingCompletionResolvers.delete(key);
        this.duplicateProcessingCompletion.delete(key);
    }

    async waitForDuplicateSourceIfActive(filePath: string): Promise<void> {
        const activeRunId = this.currentRunIds.get(filePath);
        const completion = this.duplicateProcessingCompletion.get(this.getRunCacheKey(filePath, activeRunId))
            ?? this.duplicateProcessingCompletion.get(filePath);
        if (completion) await completion;
    }

    shouldContinueProcessingDuringDuplicateDecision(): boolean {
        return !this.settings.waitForDuplicateSourceProcessing;
    }

    registerDuplicateDecisionState(
        filePath: string,
        notePath: string,
        match: DuplicateMatch,
        exactHash: string,
        visualHash: string | undefined,
        runId: string | undefined,
        decision: DuplicateDecision
    ): void {
        const actionKey = runId ?? filePath;
        const existingAction = this.pendingDuplicateActions.get(actionKey);
        this.registerPendingDuplicateAction({
            runId: actionKey,
            newImagePath: existingAction?.newImagePath ?? filePath,
            newNotePath: existingAction?.newNotePath ?? notePath,
            originalImagePath: existingAction?.originalImagePath ?? match.record.filePath,
            originalNotePath: existingAction?.originalNotePath ?? match.record.notePath,
            action: decision.action,
            autorename: decision.autorename,
            processingComplete: existingAction?.processingComplete,
        });
        this.upsertProtectedJob(filePath, {
            stage: "duplicate-decision",
            notePath,
            exactHash,
            visualHash,
            runId,
            duplicateAction: decision.action,
            duplicateMigrateLinks: decision.migrateLinks,
            duplicateMatchType: match.type,
            duplicateMatchPath: match.record.filePath,
        });
    }

    async getCompanionNoteContent(notePath: string): Promise<string> {
        const note = this.app.vault.getAbstractFileByPath(notePath);
        return note instanceof TFile ? await this.app.vault.read(note) : "";
    }

    getAiTagsFromNoteContent(content: string): string[] {
        if (!content.trim()) return [];
        const template = this.getTemplateFromExistingNote(content).template;
        const property = this.getAiTagsPropertyName();
        return (template.values[property] ?? [])
            .map(value => value.replace(/^[-\s]+/, "").replace(/^"|"$/g, ""))
            .map(value => this.normalizeAiTagName(value))
            .filter(Boolean);
    }

    mergeFolderPropertyItems(...sources: Record<string, string[]>[]): Record<string, string[]> {
        const merged: Record<string, string[]> = {};
        sources.forEach(source => Object.keys(source).forEach(property => {
            const values = merged[property] ?? [];
            source[property].forEach(value => { if (!values.includes(value)) values.push(value); });
            merged[property] = values;
        }));
        return merged;
    }
    escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    extractPathFromWikiLink(value: string): string | null {
        const match = value.match(/!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/);
        return match?.[1]?.trim() || null;
    }

    getLinkReplacementPairs(fromPath: string, toPath: string): Array<[string, string]> {
        const pairs: Array<[string, string]> = [[fromPath, toPath]];
        if (fromPath.endsWith(".md") && toPath.endsWith(".md")) {
            pairs.push([fromPath.slice(0, -3), toPath.slice(0, -3)]);
        }
        return pairs;
    }

    replaceWikiLinksInContent(content: string, replacements: Array<[string, string]>): string {
        let updated = content;
        replacements.forEach(([fromPath, toPath]) => {
            const escaped = this.escapeRegExp(fromPath);
            updated = updated.replace(new RegExp(`(!?)\\[\\[${escaped}(\\|[^\\]]*)?\\]\\]`, "g"), (_match, embedPrefix: string, alias: string | undefined) => {
                return `${embedPrefix}[[${toPath}${alias ?? ""}]]`;
            });
        });
        return updated;
    }

    hasWikiLinkToPath(content: string, path: string, requireEmbed = false): boolean {
        const normalizedPath = path.replace(/\\/g, "/");
        const prefix = requireEmbed ? "!" : "!?";
        return new RegExp(`${prefix}\\[\\[${this.escapeRegExp(normalizedPath)}(?:\\|[^\\]]*)?\\]\\]`).test(content);
    }

    appendBodyImageEmbed(content: string, embedLink: string): string {
        const parsed = this.getTemplateFromExistingNote(content);
        const frontmatterLines = parsed.template.order
            .map(property => this.buildYamlProperty(property, parsed.template.values[property] ?? []))
            .join("\n");
        const body = parsed.body.replace(/\r\n/g, "\n").trimEnd();
        const bodyContent = body ? `${body}\n\n${embedLink}` : embedLink;
        return `---\n${frontmatterLines}\n---\n\n${bodyContent}\n`;
    }

    async refreshCompanionSourceFileLinks(note: TFile, imagePath: string, previousImagePaths: string[] = []): Promise<void> {
        const normalizedImagePath = imagePath.replace(/\\/g, "/");
        const image = this.app.vault.getAbstractFileByPath(normalizedImagePath);
        if (!(image instanceof TFile)) return;

        const metadata = this.buildFolderMetadata(normalizedImagePath);
        const propertyItems: Record<string, string[]> = {};
        if (this.settings.linkToFilePropertyEnabled) {
            propertyItems[this.getLinkToFilePropertyName()] = [`"${metadata.wikiLink}"`];
        }
        if (this.settings.fileTypePropertyEnabled) {
            propertyItems[this.getFileTypePropertyName()] = [`"${metadata.fileExt}"`];
        }
        if (this.settings.embedPropertyEnabled) {
            propertyItems[this.getEmbedPropertyName()] = [`"${metadata.embedLink}"`];
        }

        const content = await this.app.vault.read(note);
        let updated = Object.keys(propertyItems).length > 0
            ? this.mergeFrontmatterPropertyItems(content, propertyItems)
            : content;

        const previousPaths = Array.from(new Set(previousImagePaths
            .map(path => path.replace(/\\/g, "/"))
            .filter(path => path && path !== normalizedImagePath)));
        const replacements = previousPaths.flatMap(path => this.getLinkReplacementPairs(path, normalizedImagePath));
        if (replacements.length > 0) {
            updated = this.replaceWikiLinksInContent(updated, replacements);
        }

        if (this.settings.writeImageEmbedInBody && !this.hasWikiLinkToPath(updated, normalizedImagePath, true)) {
            updated = this.appendBodyImageEmbed(updated, metadata.embedLink);
        }

        if (updated !== content) {
            await this.app.vault.modify(note, updated);
        }
    }

    async migrateDuplicateLinks(oldImagePath: string, oldNotePath: string, newImagePath: string, newNotePath: string): Promise<number> {
        const replacements = [
            ...this.getLinkReplacementPairs(oldImagePath, newImagePath),
            ...this.getLinkReplacementPairs(oldNotePath, newNotePath),
        ];
        let changedFiles = 0;
        for (const note of this.app.vault.getMarkdownFiles()) {
            const content = await this.app.vault.read(note);
            const updated = this.replaceWikiLinksInContent(content, replacements);
            if (updated !== content) {
                await this.app.vault.modify(note, updated);
                changedFiles += 1;
            }
        }
        return changedFiles;
    }
    getAutorenameImagePath(file: TFile): string | null {
        const extension = file.extension || (file.name.includes(".") ? file.name.split(".").pop() ?? "" : "");
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const match = nameWithoutExt.match(/^(.*)\s+\d+$/);
        if (!match) return null;
        const parentPath = file.parent?.path ?? "";
        const cleanName = extension ? `${match[1]}.${extension}` : match[1];
        const cleanPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;
        return cleanPath !== file.path && !(this.app.vault.getAbstractFileByPath(cleanPath) instanceof TFile) ? cleanPath : null;
    }

    async autorenameReplacedDuplicate(file: TFile, note: TFile): Promise<{ file: TFile; note: TFile }> {
        let currentFile = file;
        let currentNote = note;
        const cleanImagePath = this.getAutorenameImagePath(currentFile);
        if (cleanImagePath) {
            const renamedFile = await this.renameFileWithoutLinkedCascade(currentFile, cleanImagePath);
            if (renamedFile instanceof TFile) currentFile = renamedFile;
        }

        const cleanNotePath = this.getBfmNotePath(currentFile);
        if (currentNote.path !== cleanNotePath && !(this.app.vault.getAbstractFileByPath(cleanNotePath) instanceof TFile)) {
            const renamedNote = await this.renameFileWithoutLinkedCascade(currentNote, cleanNotePath);
            if (renamedNote instanceof TFile) currentNote = renamedNote;
        }

        return { file: currentFile, note: currentNote };
    }

    async deleteFileWithoutLinkedCascade(file: TFile | null, runId?: string): Promise<void> {
        if (!(file instanceof TFile)) return;
        const filePath = file.path;
        if (!(this.app.vault.getAbstractFileByPath(filePath) instanceof TFile)) return;
        this.deletionCascadePaths.add(filePath);
        this.suppressDeletedPath(filePath, runId);
        try {
            await this.app.vault.delete(file);
        } finally {
            window.setTimeout(() => this.deletionCascadePaths.delete(filePath), 1000);
            window.setTimeout(() => this.clearDeletionSuppression(filePath), 5000);
        }
    }

    async renameFileWithoutLinkedCascade(file: TFile, newPath: string): Promise<TFile | null> {
        this.deletionCascadePaths.add(file.path);
        this.suppressDeletedPath(file.path);
        try {
            await this.app.vault.rename(file, newPath);
        } finally {
            window.setTimeout(() => this.deletionCascadePaths.delete(file.path), 1000);
        }
        const renamed = this.app.vault.getAbstractFileByPath(newPath);
        return renamed instanceof TFile ? renamed : null;
    }

    async deleteNewDuplicatePair(file: TFile, note: TFile, runId?: string): Promise<void> {
        const filePath = file.path;
        const notePath = note.path;
        if (runId && !this.isCurrentRun(filePath, runId)) return;

        this.deletionCascadePaths.add(filePath);
        this.deletionCascadePaths.add(notePath);
        this.suppressDeletedPath(filePath, runId ?? null);
        this.suppressDeletedPath(notePath, runId ?? null);
        try {
            await this.deleteFileWithoutLinkedCascade(note, runId);
            await this.deleteFileWithoutLinkedCascade(file, runId);
        } finally {
            window.setTimeout(() => this.deletionCascadePaths.delete(filePath), 1000);
            window.setTimeout(() => this.deletionCascadePaths.delete(notePath), 1000);
        }
        this.cleanupProcessingStateForPath(filePath, runId);
        this.cleanupProcessingStateForPath(notePath);
        this.markDuplicateProcessingComplete(filePath, runId);
        this.clearDeletionSuppression(filePath);
        this.clearDeletionSuppression(notePath);
        await this.saveSettings();
        new Notice(`Deleted new duplicate pair: ${file.name}`);
    }

    async replaceDuplicateWithNewKeepingNewLocation(file: TFile, note: TFile, handling: DuplicateHandlingResult, runId?: string): Promise<void> {
        if (!handling.match) return;
        const oldImagePath = handling.match.record.filePath;
        const oldNotePath = handling.match.record.notePath;
        const newImagePath = file.path;
        const activePair = runId ? this.activeRunPairs.get(runId) : null;
        const keptPairId = activePair?.pairId
            ?? this.getPairRecordForImagePath(file.path)?.pairId
            ?? this.getPairRecordForNotePath(note.path)?.pairId;
        const oldImage = this.app.vault.getAbstractFileByPath(oldImagePath);
        const oldNote = this.app.vault.getAbstractFileByPath(oldNotePath);
        await this.deleteFileWithoutLinkedCascade(oldNote instanceof TFile ? oldNote : null);
        await this.deleteFileWithoutLinkedCascade(oldImage instanceof TFile ? oldImage : null);
        this.cleanupProcessingStateForPath(oldImagePath);
        this.cleanupProcessingStateForPath(oldNotePath);
        this.removePairRecordsForPath(oldImagePath);
        this.removePairRecordsForPath(oldNotePath);
        const kept = handling.autorename ? await this.autorenameReplacedDuplicate(file, note) : { file, note };
        if (handling.migrateLinks) {
            const changed = await this.migrateDuplicateLinks(oldImagePath, oldNotePath, kept.file.path, kept.note.path);
            if (changed > 0) new Notice(`Migrated duplicate links in ${changed} note${changed === 1 ? "" : "s"}.`);
        }
        await this.refreshCompanionSourceFileLinks(kept.note, kept.file.path, [newImagePath, oldImagePath]);
        if (activePair && runId) {
            this.updateActiveRunPair(runId!, {
                imagePath: kept.file.path,
                expectedNotePath: this.getBfmNotePath(kept.file),
                resolvedNotePath: kept.note.path,
            });
        }
        this.updatePairRecord(keptPairId, { imagePath: kept.file.path, notePath: kept.note.path });
        this.upsertDuplicateRecord({
            filePath: kept.file.path,
            notePath: kept.note.path,
            exactHash: handling.exactHash,
            visualHash: handling.visualHash,
            processedAt: Date.now(),
        });
        new Notice(`Replaced original duplicate and kept new location: ${kept.file.path}`);
    }

    async replaceDuplicateWithNewKeepingOriginalPaths(file: TFile, note: TFile, handling: DuplicateHandlingResult, runId?: string): Promise<void> {
        if (!handling.match) return;
        const oldImagePath = handling.match.record.filePath;
        const oldNotePath = handling.match.record.notePath;
        const newImagePath = file.path;
        const newNotePath = note.path;
        const activePair = runId ? this.activeRunPairs.get(runId) : null;
        const keptPairId = activePair?.pairId
            ?? this.getPairRecordForImagePath(newImagePath)?.pairId
            ?? this.getPairRecordForNotePath(newNotePath)?.pairId;
        const oldImage = this.app.vault.getAbstractFileByPath(oldImagePath);
        const oldNote = this.app.vault.getAbstractFileByPath(oldNotePath);

        await this.deleteFileWithoutLinkedCascade(oldNote instanceof TFile ? oldNote : null);
        await this.deleteFileWithoutLinkedCascade(oldImage instanceof TFile ? oldImage : null);

        const movedImage = await this.renameFileWithoutLinkedCascade(file, oldImagePath);
        const movedNote = await this.renameFileWithoutLinkedCascade(note, oldNotePath);
        this.clearDeletionSuppression(oldImagePath);
        this.clearDeletionSuppression(oldNotePath);
        if (movedNote instanceof TFile) {
            const content = await this.app.vault.read(movedNote);
            const updated = this.replaceWikiLinksInContent(content, [
                ...this.getLinkReplacementPairs(newImagePath, oldImagePath),
                ...this.getLinkReplacementPairs(newNotePath, oldNotePath),
            ]);
            if (updated !== content) await this.app.vault.modify(movedNote, updated);
            await this.refreshCompanionSourceFileLinks(movedNote, oldImagePath, [newImagePath]);
        }
        if (handling.migrateLinks) {
            const changed = await this.migrateDuplicateLinks(newImagePath, newNotePath, oldImagePath, oldNotePath);
            if (changed > 0) new Notice(`Migrated duplicate links in ${changed} note${changed === 1 ? "" : "s"}.`);
        }

        this.cleanupProcessingStateForPath(newImagePath);
        this.cleanupProcessingStateForPath(newNotePath);
        this.removeDuplicateRecordsForPath(oldImagePath);
        this.removeDuplicateRecordsForPath(oldNotePath);
        this.removePairRecordsForPath(oldImagePath);
        this.removePairRecordsForPath(oldNotePath);
        if (activePair && runId) {
            this.updateActiveRunPair(runId!, {
                imagePath: oldImagePath,
                expectedNotePath: oldNotePath,
                resolvedNotePath: oldNotePath,
            });
        }
        this.updatePairRecord(keptPairId, { imagePath: oldImagePath, notePath: oldNotePath });
        this.upsertDuplicateRecord({
            filePath: oldImagePath,
            notePath: oldNotePath,
            exactHash: handling.exactHash,
            visualHash: handling.visualHash,
            processedAt: Date.now(),
        });
        if (movedImage instanceof TFile) this.indexVocabularyFile(movedImage);
        new Notice(`Replaced original duplicate and kept original paths: ${oldImagePath}`);
    }

    async resolveDuplicateDecisionBeforeFinalAction(file: TFile, note: TFile, handling: DuplicateHandlingResult, runId?: string): Promise<DuplicateHandlingResult> {
        if (!handling.decisionPromise) return handling;

        if (handling.match) {
            this.upsertProtectedJob(file.path, {
                stage: "waiting-duplicate-choice",
                notePath: note.path,
                exactHash: handling.exactHash,
                visualHash: handling.visualHash,
                runId,
                duplicateAction: "ask",
                duplicateMigrateLinks: this.settings.duplicateMigrateLinksOnReplace,
                duplicateMatchType: handling.match.type,
                duplicateMatchPath: handling.match.record.filePath,
            });
            await this.saveSettings();
        }

        const decision = await handling.decisionPromise;
        if (runId && !this.isCurrentRun(file.path, runId)) {
            return { ...handling, action: null, migrateLinks: false, autorename: false };
        }
        return {
            ...handling,
            action: decision.action,
            migrateLinks: decision.migrateLinks,
            autorename: decision.autorename,
            decisionPromise: undefined,
        };
    }

    async finalizeDuplicateAction(file: TFile, note: TFile, handling: DuplicateHandlingResult, runId?: string): Promise<DuplicateHandlingResult> {
        if (handling.decisionPromise && !this.settings.waitForDuplicateSourceProcessing) {
            this.scheduleDuplicateDecisionAfterProcessing(file, note, handling, runId);
            return {
                ...handling,
                action: "process",
                migrateLinks: false,
                autorename: false,
                decisionPromise: undefined,
            };
        }

        const resolvedHandling = await this.resolveDuplicateDecisionBeforeFinalAction(file, note, handling, runId);
        if (resolvedHandling.match && resolvedHandling.action === "delete-new-pair") {
            await this.deleteNewDuplicatePair(file, note, runId);
            return resolvedHandling;
        }
        await this.finalizeReplaceDuplicateAction(file, note, resolvedHandling, runId);
        return resolvedHandling;
    }

    scheduleDuplicateDecisionAfterProcessing(file: TFile, note: TFile, handling: DuplicateHandlingResult, runId?: string): void {
        if (!handling.match || !handling.decisionPromise) return;
        const actionKey = runId ?? file.path;
        if (this.scheduledDuplicateDecisionHandlers.has(actionKey)) return;

        const existingAction = this.pendingDuplicateActions.get(actionKey);
        this.pendingDuplicateActions.set(actionKey, {
            runId: actionKey,
            newImagePath: file.path,
            newNotePath: note.path,
            originalImagePath: handling.match.record.filePath,
            originalNotePath: handling.match.record.notePath,
            action: existingAction?.action ?? "ask",
            autorename: existingAction?.autorename ?? this.settings.duplicateAutorenameOnReplace,
            processingComplete: true,
        });

        this.scheduledDuplicateDecisionHandlers.add(actionKey);
        const decisionPromise = handling.decisionPromise;
        window.setTimeout(() => {
            void decisionPromise
                .then(async decision => {
                    const pendingAction = this.pendingDuplicateActions.get(actionKey);
                    const newImagePath = pendingAction?.newImagePath ?? file.path;
                    const newNotePath = pendingAction?.newNotePath ?? note.path;
                    const currentFile = this.app.vault.getAbstractFileByPath(newImagePath);
                    const currentNote = this.app.vault.getAbstractFileByPath(newNotePath);

                    if (decision.action === "process") {
                        return;
                    }

                    if (!(currentFile instanceof TFile) || !(currentNote instanceof TFile)) {
                        new Notice("Duplicate action skipped because the generated duplicate pair is no longer available.");
                        return;
                    }

                    const resolvedHandling: DuplicateHandlingResult = {
                        ...handling,
                        action: decision.action,
                        migrateLinks: decision.migrateLinks,
                        autorename: decision.autorename,
                        decisionPromise: undefined,
                    };

                    if (decision.action === "delete-new-pair") {
                        await this.deleteNewDuplicatePair(currentFile, currentNote);
                    } else {
                        await this.finalizeReplaceDuplicateAction(currentFile, currentNote, resolvedHandling);
                    }
                })
                .catch(error => {
                    console.error("Maru\'s Autotag duplicate decision failed after processing", error);
                    new Notice("Duplicate action failed after processing. Check the developer console.");
                })
                .finally(async () => {
                    const pendingAction = this.pendingDuplicateActions.get(actionKey);
                    if (pendingAction) this.removeProtectedJob(pendingAction.newImagePath);
                    this.removeProtectedJob(file.path);
                    this.clearPendingDuplicateAction(actionKey);
                    this.scheduledDuplicateDecisionHandlers.delete(actionKey);
                    await this.saveSettings();
                });
        }, 250);
    }

    async finalizeReplaceDuplicateAction(file: TFile, note: TFile, handling: DuplicateHandlingResult, runId?: string): Promise<void> {
        if (!handling.match) {
            this.clearPendingDuplicateAction(runId);
            return;
        }
        try {
            if (this.settings.waitForDuplicateSourceProcessing && (handling.action === "replace-original-keep-new" || handling.action === "replace-original-keep-original")) {
                await this.waitForDuplicateSourceIfActive(handling.match.record.filePath);
            }
            if (handling.action === "replace-original-keep-new") {
                await this.replaceDuplicateWithNewKeepingNewLocation(file, note, handling, runId);
            } else if (handling.action === "replace-original-keep-original") {
                await this.replaceDuplicateWithNewKeepingOriginalPaths(file, note, handling, runId);
            }
        } finally {
            this.clearPendingDuplicateAction(runId);
        }
    }

    async askDuplicateDecision(file: TFile, notePath: string, match: DuplicateMatch, runId?: string): Promise<DuplicateDecision> {
        return new Promise(resolve => new DuplicateDecisionModal(this.app, this, file, notePath, match, resolve, runId).open());
    }

    async prepareDuplicateHandling(file: TFile, runId?: string): Promise<DuplicateHandlingResult> {
        if (!this.isDuplicateProtectionActive()) return { match: null, exactHash: "", visualHash: undefined, action: null, migrateLinks: false, autorename: false };

        let notePath = this.getBfmNotePath(file);
        const previousClaim = this.duplicateClaimLock;
        let releaseClaim: () => void = () => undefined;
        this.duplicateClaimLock = new Promise<void>(resolve => { releaseClaim = resolve; });

        let exactHash = "";
        let visualHash: string | undefined;
        let match: DuplicateMatch | null = null;

        await previousClaim;
        try {
            const fingerprint = await this.getDuplicateFingerprint(file, runId);
            if (runId && !this.isCurrentRun(file.path, runId)) {
                return { match: null, exactHash: fingerprint.exactHash, visualHash: fingerprint.visualHash, action: null, migrateLinks: false, autorename: false };
            }
            notePath = this.getBfmNotePath(file);
            exactHash = fingerprint.exactHash;
            visualHash = fingerprint.visualHash;
            match = this.findDuplicateMatch(file.path, exactHash, visualHash);
            this.upsertDuplicateRecord({
                filePath: file.path,
                notePath,
                exactHash,
                visualHash,
                processedAt: Date.now(),
            });
            this.ensureDuplicateProcessingCompletion(file.path, runId);
            this.upsertProtectedJob(file.path, { stage: "fingerprinted", notePath, exactHash, visualHash, runId });
            await this.saveSettings();
        } finally {
            releaseClaim();
        }

        if (!match) return { match: null, exactHash, visualHash, action: null, migrateLinks: false, autorename: false };

        const duplicateMatch = match;
        const configuredAction = this.getDuplicateActionForMatch(duplicateMatch);
        if (configuredAction === "ask") {
            const pendingDecision: DuplicateDecision = {
                action: "ask",
                migrateLinks: this.settings.duplicateMigrateLinksOnReplace,
                autorename: this.settings.duplicateAutorenameOnReplace,
            };
            this.registerDuplicateDecisionState(file.path, notePath, duplicateMatch, exactHash, visualHash, runId, pendingDecision);
            await this.saveSettings();

            const decisionPromise = this.askDuplicateDecision(file, notePath, duplicateMatch, runId).then(async decision => {
                this.registerDuplicateDecisionState(file.path, notePath, duplicateMatch, exactHash, visualHash, runId, decision);
                await this.saveSettings();
                return decision;
            });

            if (this.shouldContinueProcessingDuringDuplicateDecision()) {
                console.log("Maru\'s Autotag duplicate detected; continuing processing while decision popup is open.", {
                    file: file.path,
                    match: duplicateMatch.record.filePath,
                    matchType: duplicateMatch.type,
                });
                return { match: duplicateMatch, exactHash, visualHash, action: "process", migrateLinks: false, autorename: false, decisionPromise };
            }

            const decision = await decisionPromise;
            if (runId && !this.isCurrentRun(file.path, runId)) {
                return { match: null, exactHash, visualHash, action: null, migrateLinks: false, autorename: false };
            }
            return { match: duplicateMatch, exactHash, visualHash, action: decision.action, migrateLinks: decision.migrateLinks, autorename: decision.autorename };
        }

        const decision: DuplicateDecision = {
            action: configuredAction,
            migrateLinks: this.settings.duplicateMigrateLinksOnReplace,
            autorename: this.settings.duplicateAutorenameOnReplace,
        };
        this.registerDuplicateDecisionState(file.path, notePath, duplicateMatch, exactHash, visualHash, runId, decision);
        await this.saveSettings();
        return { match: duplicateMatch, exactHash, visualHash, action: decision.action, migrateLinks: decision.migrateLinks, autorename: decision.autorename };
    }

    getPreparedDuplicateHandling(file: TFile, runId?: string): Promise<DuplicateHandlingResult> {
        const cacheKey = this.getRunCacheKey(file.path, runId);
        const existing = this.duplicateHandlingCache.get(cacheKey);
        if (existing) return existing;

        const handling = this.prepareDuplicateHandling(file, runId);
        this.duplicateHandlingCache.set(cacheKey, handling);
        handling.catch(() => this.duplicateHandlingCache.delete(cacheKey));
        return handling;
    }
    normalizeVaultVocabularyTerm(value: string): string {
        const unquoted = value
            .trim()
            .replace(/^"+|"+$/g, "")
            .replace(/^\'+|\'+$/g, "")
            .trim();

        return this.normalizeAiTagName(unquoted);
    }

    getFrontmatterListValue(frontmatter: Record<string, unknown>, keys: string[]): string[] {
        const values: string[] = [];

        for (const key of keys) {
            const rawValue = frontmatter[key];
            if (Array.isArray(rawValue)) {
                rawValue.forEach(item => {
                    if (typeof item === "string") values.push(item);
                });
            } else if (typeof rawValue === "string") {
                rawValue
                    .split(",")
                    .map(value => value.trim())
                    .filter(Boolean)
                    .forEach(value => values.push(value));
            }
        }

        return values;
    }

    getVaultAwarenessCandidateProperties(): string[] {
        const properties = new Set<string>();
        this.getFolderPropertyMappings().forEach(mapping => {
            if (!mapping.useAsVaultCandidate) return;
            const property = this.normalizeFolderFallbackProperty(mapping.property);
            if (property) properties.add(property);
        });

        if (this.settings.folderFallbackUseAsVaultCandidate) {
            const fallbackProperty = this.normalizeFolderFallbackProperty(this.settings.folderFallbackProperty);
            if (fallbackProperty) properties.add(fallbackProperty);
        }

        if (this.settings.aiTagsUseAsVaultCandidate) {
            const aiTagsProperty = this.getAiTagsPropertyName();
            if (aiTagsProperty) properties.add(aiTagsProperty);
        }

        return Array.from(properties).sort((a, b) => a.localeCompare(b));
    }

    getVocabularyRecordsForFile(file: TFile): VaultVocabularyRecord[] {
        if (file.extension !== "md") return [];

        const cache = this.app.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter as Record<string, unknown> | undefined;
        if (!frontmatter) return [];

        const lastSeen = file.stat.mtime;
        const records: VaultVocabularyRecord[] = [];
        const excludedTerms = this.getExcludedVocabularyTermSet();

        this.getVaultAwarenessCandidateProperties().forEach(property => {
            const values = this.getFrontmatterListValue(frontmatter, [property]);
            const isAliasProperty = property.toLowerCase() === "alias" || property.toLowerCase() === "aliases";

            if (isAliasProperty && values.length > 0) {
                const canonicalName = this.normalizeVaultVocabularyTerm(file.basename);
                const aliases = values
                    .map(value => this.normalizeVaultVocabularyTerm(value))
                    .filter(alias => alias && !excludedTerms.has(alias.toLowerCase()));
                if (canonicalName && !excludedTerms.has(canonicalName.toLowerCase())) {
                    records.push({ name: canonicalName, source: "configured", lastSeen, aliases });
                }
                return;
            }

            values.forEach(value => {
                const name = this.normalizeVaultVocabularyTerm(value);
                if (name && !excludedTerms.has(name.toLowerCase())) {
                    records.push({ name, source: "configured", lastSeen, aliases: [] });
                }
            });
        });

        const unique = new Map<string, VaultVocabularyRecord>();
        records.forEach(record => {
            const key = `${record.source}:${record.name.toLowerCase()}`;
            const existing = unique.get(key);
            if (existing) {
                const aliases = new Map(existing.aliases.map(alias => [alias.toLowerCase(), alias]));
                record.aliases.forEach(alias => aliases.set(alias.toLowerCase(), alias));
                existing.aliases = Array.from(aliases.values());
            } else {
                unique.set(key, record);
            }
        });

        return Array.from(unique.values());
    }

    rebuildVaultVocabularyAggregate(): void {
        this.vaultVocabulary.clear();
        this.vaultAliasToCanonical.clear();

        this.vocabularyByFile.forEach(records => {
            records.forEach(record => {
                const key = record.name.toLowerCase();
                const existing = this.vaultVocabulary.get(key);

                if (existing) {
                    existing.frequency += 1;
                    existing.lastSeen = Math.max(existing.lastSeen, record.lastSeen);
                    existing.sources.add(record.source);
                    record.aliases.forEach(alias => existing.aliases.add(alias));
                } else {
                    this.vaultVocabulary.set(key, {
                        name: record.name,
                        frequency: 1,
                        lastSeen: record.lastSeen,
                        sources: new Set([record.source]),
                        aliases: new Set(record.aliases),
                    });
                }
            });
        });

        this.vaultVocabulary.forEach(entry => {
            this.vaultAliasToCanonical.set(entry.name.toLowerCase(), entry.name);
        });
        this.vaultVocabulary.forEach(entry => {
            entry.aliases.forEach(alias => {
                const aliasKey = alias.toLowerCase();
                if (!this.vaultAliasToCanonical.has(aliasKey)) {
                    this.vaultAliasToCanonical.set(aliasKey, entry.name);
                }
            });
        });
    }

    indexVocabularyFile(file: TFile): void {
        if (file.extension !== "md") return;

        const records = this.getVocabularyRecordsForFile(file);
        if (records.length > 0) {
            this.vocabularyByFile.set(file.path, records);
        } else {
            this.vocabularyByFile.delete(file.path);
        }

        this.rebuildVaultVocabularyAggregate();
    }

    removeVocabularyFile(path: string): void {
        if (this.vocabularyByFile.delete(path)) {
            this.rebuildVaultVocabularyAggregate();
        }
    }

    buildVaultVocabularyCache(): void {
        this.vocabularyByFile.clear();

        this.app.vault.getMarkdownFiles().forEach(file => {
            const records = this.getVocabularyRecordsForFile(file);
            if (records.length > 0) {
                this.vocabularyByFile.set(file.path, records);
            }
        });

        this.rebuildVaultVocabularyAggregate();
    }

    getTextMatchScore(term: string, text: string, allowGrammaticalVariants = true, allowCompoundDecomposition = true): number {
        const normalizedText = text.toLowerCase();
        const normalizedTerm = term.toLowerCase();
        if (!normalizedText || !normalizedTerm) return 0;

        let score = 0;
        const phrasePattern = new RegExp(`(^|\\W)${this.escapeRegex(normalizedTerm)}($|\\W)`, "i");
        if (phrasePattern.test(normalizedText)) {
            score += 12;
        }

        const words = normalizedTerm.split(/\s+/).filter(word => word.length >= 4);
        if (allowCompoundDecomposition) words.forEach(word => {
            const wordPattern = new RegExp(`(^|\\W)${this.escapeRegex(word)}($|\\W)`, "i");
            if (wordPattern.test(normalizedText)) score += 3;
        });

        if (score === 0 && allowGrammaticalVariants && (allowCompoundDecomposition || words.length === 1)) {
            const textWords = normalizedText.match(/[a-z0-9]+/g) ?? [];
            const textVariants = new Set(
                textWords
                    .filter(word => word.length >= 5)
                    .map(word => this.getWordVariantStem(word))
                    .filter(stem => stem.length >= 6)
            );

            words.forEach(word => {
                const stem = this.getWordVariantStem(word);
                if (stem.length >= 6 && textVariants.has(stem)) {
                    score += 2;
                }
            });
        }

        return score;
    }

    getWordVariantStem(word: string): string {
        let stem = word.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (stem.length < 5) return stem;

        if (stem.endsWith("ies") && stem.length > 5) {
            stem = `${stem.slice(0, -3)}y`;
        } else if (stem.endsWith("es") && stem.length > 6) {
            stem = stem.slice(0, -2);
        } else if (stem.endsWith("s") && !stem.endsWith("ss") && stem.length > 5) {
            stem = stem.slice(0, -1);
        }

        const derivationalSuffixes = [
            "istically", "ationally", "ically", "ability", "ibility",
            "ational", "fulness", "ousness", "iveness", "tional",
            "ical", "fully", "lessly", "ingly", "edly", "ment",
            "ness", "able", "ible", "ive", "ous", "ing", "ed",
            "ic", "al", "ly",
        ];

        for (const suffix of derivationalSuffixes) {
            if (stem.endsWith(suffix) && stem.length - suffix.length >= 6) {
                stem = stem.slice(0, -suffix.length);
                break;
            }
        }

        if (stem.endsWith("e") && stem.length >= 7) {
            stem = stem.slice(0, -1);
        }

        return stem;
    }

    canonicalizeVaultTerm(value: string, enabled = true): string {
        const normalized = this.normalizeAiTagName(value);
        return enabled
            ? this.vaultAliasToCanonical.get(normalized.toLowerCase()) ?? normalized
            : normalized;
    }

    getVaultTermAliases(term: string): string[] {
        return Array.from(this.vaultVocabulary.get(term.toLowerCase())?.aliases ?? []);
    }

    getVaultPromptLabel(term: string): string {
        const aliases = this.getVaultTermAliases(term);
        return aliases.length > 0 ? `${term} (aliases: ${aliases.join(", ")})` : term;
    }

    isConceptSupportedLocally(
        term: string,
        evidenceText: string,
        features: LinguisticFeatureSettings
    ): boolean {
        const normalizedTermWords = term.toLowerCase().match(/[a-z0-9]+/g) ?? [];
        const normalizedEvidenceWords = evidenceText.toLowerCase().match(/[a-z0-9]+/g) ?? [];
        if (normalizedTermWords.length > 0) {
            const normalizedTermPhrase = ` ${normalizedTermWords.join(" ")} `;
            const normalizedEvidencePhrase = ` ${normalizedEvidenceWords.join(" ")} `;
            if (normalizedEvidencePhrase.includes(normalizedTermPhrase)) return true;
        }

        if (this.getTextMatchScore(term, evidenceText, features.grammaticalVariants === "use", features.compoundDecomposition === "use") > 0) return true;

        if (features.vaultAliases === "use") {
            const canonical = this.canonicalizeVaultTerm(term, true);
            const aliases = this.getVaultTermAliases(canonical);
            if (aliases.some(alias => this.getTextMatchScore(alias, evidenceText, features.grammaticalVariants === "use", features.compoundDecomposition === "use") > 0)) {
                return true;
            }
        }

        if (features.acronymsAbbreviations === "use") {
            const words = term.toLowerCase().match(/[a-z0-9]+/g) ?? [];
            if (words.length >= 2) {
                const acronym = words.map(word => word[0]).join("");
                const acronymPattern = new RegExp(`(^|\\W)${this.escapeRegex(acronym)}($|\\W)`, "i");
                if (acronym.length >= 2 && acronymPattern.test(evidenceText)) return true;
            }
        }

        return false;
    }

    parseManualEnrichmentRules(): Map<string, string[]> {
        const rules = new Map<string, string[]>();

        this.settings.manualEnrichmentRules
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("#"))
            .forEach(line => {
                const separator = line.includes("=>") ? "=>" : line.includes(":") ? ":" : "";
                if (!separator) return;

                const [source, targets] = line.split(separator);
                const sourceName = this.normalizeAiTagName(source);
                if (!sourceName || !targets) return;

                const targetNames = targets
                    .split(",")
                    .map(target => this.normalizeAiTagName(target))
                    .filter(Boolean);

                if (targetNames.length > 0) {
                    rules.set(sourceName.toLowerCase(), targetNames);
                }
            });

        return rules;
    }


    parseManualSubjectBridgeRules(): { sources: string[]; targets: string[] }[] {
        return this.settings.manualSubjectBridgeRules
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("#"))
            .map(line => {
                const separator = line.includes("=>") ? "=>" : line.includes(":") ? ":" : "";
                if (!separator) return null;

                const [sourceText, targetText] = line.split(separator);
                const sources = sourceText
                    .split(",")
                    .map(source => this.normalizeAiTagName(source))
                    .filter(Boolean);
                const targets = targetText
                    .split(",")
                    .map(target => this.normalizeAiTagName(target))
                    .filter(Boolean);

                return sources.length > 0 && targets.length > 0 ? { sources, targets } : null;
            })
            .filter((rule): rule is { sources: string[]; targets: string[] } => rule !== null);
    }

    getExcludedVocabularyTermSet(): Set<string> {
        return new Set(this.settings.excludedVocabularyTerms
            .map(value => this.normalizeVaultVocabularyTerm(value).toLowerCase())
            .filter(Boolean));
    }


    isCandidateSourceActive(mode: CandidateMode): boolean {
        return mode === "consider" || mode === "all";
    }

    getFolderTagCandidates(folderCandidateValues: string[]): string[] {
        const excludedTerms = this.getExcludedVocabularyTermSet();
        const seen = new Set<string>();
        const candidates: string[] = [];
        const add = (value: string) => {
            const normalized = this.normalizeAiTagName(value);
            const key = normalized.toLowerCase();
            if (!normalized || seen.has(key) || excludedTerms.has(key)) return;
            seen.add(key);
            candidates.push(normalized);
        };

        folderCandidateValues.forEach(add);
        return candidates;
    }
    getFilenameKeywordCandidates(file: TFile | null): string[] {
        if (!file || this.settings.filenameCandidateMode === "disabled") {
            return [];
        }

        const excludedTerms = this.getExcludedVocabularyTermSet();
        const stopWords = new Set([
            "a", "an", "and", "are", "as", "at", "by", "for", "from", "in", "into", "is",
            "of", "on", "or", "the", "to", "with", "without", "und", "oder", "der", "die", "das",
            "ein", "eine", "einer", "eines", "mit", "von", "zu", "im", "am"
        ]);
        const basename = file.basename
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .trim();
        const words = basename
            .split(/\s+/)
            .map(word => word.trim())
            .filter(word => word.length >= 2)
            .filter(word => !/^\d+$/.test(word))
            .filter(word => !stopWords.has(word.toLowerCase()))
            .map(word => this.normalizeAiTagName(word))
            .filter(word => word && !excludedTerms.has(word.toLowerCase()));

        const candidates: string[] = [];
        const seen = new Set<string>();
        const add = (value: string) => {
            const normalized = this.normalizeAiTagName(value);
            const key = normalized.toLowerCase();
            if (!normalized || seen.has(key) || excludedTerms.has(key)) return;
            seen.add(key);
            candidates.push(normalized);
        };

        words.forEach(add);
        for (let index = 0; index < words.length - 1; index++) {
            add(`${words[index]} ${words[index + 1]}`);
        }

        return candidates.slice(0, 24);
    }
    getRankedVaultVocabularyTerms(
        aiDescription: string,
        filenameCandidates: string[] = [],
        folderTagCandidates: string[] = []
    ): string[] {
        const excluded = new Set<string>();
        if (this.settings.folderTagsCandidateMode === "exclude") {
            folderTagCandidates.forEach(value => excluded.add(value.toLowerCase()));
        }
        if (this.settings.filenameCandidateMode === "exclude") {
            filenameCandidates.forEach(value => excluded.add(value.toLowerCase()));
        }
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const folderText = folderTagCandidates.join(" ");
        const filenameText = filenameCandidates.join(" ");
        const manualRules = this.parseManualEnrichmentRules();
        const manualTargets = new Set<string>();
        manualRules.forEach(targets => targets.forEach(target => manualTargets.add(target.toLowerCase())));

        return Array.from(this.vaultVocabulary.values())
            .filter(entry => !excluded.has(entry.name.toLowerCase()))
            .map(entry => {
                const ageMs = Math.max(0, now - entry.lastSeen);
                const recencyBonus = Math.max(0, 5 - (ageMs / thirtyDaysMs) * 5);
                const names = this.settings.vaultLinguisticFeatures.vaultAliases === "use"
                    ? [entry.name, ...entry.aliases]
                    : [entry.name];
                const bestMatch = (text: string) => Math.max(...names.map(name =>
                    this.getTextMatchScore(name, text, this.settings.vaultLinguisticFeatures.grammaticalVariants === "use", this.settings.vaultLinguisticFeatures.compoundDecomposition === "use")
                ));
                const descriptionBonus = bestMatch(aiDescription);
                const folderBonus = this.settings.folderTagsCandidateMode === "all" ? bestMatch(folderText) : 0;
                const filenameBonus = this.settings.filenameCandidateMode === "all" ? bestMatch(filenameText) : 0;
                const manualBonus = manualTargets.has(entry.name.toLowerCase()) ? 2 : 0;
                const evidenceScore = descriptionBonus + folderBonus + filenameBonus + manualBonus;

                return {
                    name: entry.name,
                    score: (evidenceScore * 10) + Math.min(entry.frequency, 5) + (recencyBonus * 0.25),
                };
            })
            .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
            .slice(0, this.settings.maxPromptVocabularyTerms)
            .map(entry => entry.name);
    }
    escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    tagContainsKnownVocabularyTerm(domain: string, knownTerm: string): boolean {
        if (domain.toLowerCase() === knownTerm.toLowerCase()) return false;

        const pattern = new RegExp(`(^|\\s)${this.escapeRegex(knownTerm)}($|\\s)`, "i");
        return pattern.test(domain);
    }

    normalizeUniqueAiTags(values: string[]): string[] {
        const seen = new Set<string>();
        const normalizedValues: string[] = [];
        values.forEach(value => {
            const normalized = this.normalizeAiTagName(value);
            const key = normalized.toLowerCase();
            if (!normalized || seen.has(key)) return;
            seen.add(key);
            normalizedValues.push(normalized);
        });
        return normalizedValues;
    }

    expandAiTagsWithKnownVocabulary(
        aiTags: string[],
        filenameCandidates: string[] = [],
        folderTagCandidates: string[] = []
    ): string[] {
        const excluded = new Set<string>();
        if (this.settings.folderTagsCandidateMode === "exclude") {
            folderTagCandidates.forEach(value => excluded.add(value.toLowerCase()));
        }
        if (this.settings.filenameCandidateMode === "exclude") {
            filenameCandidates.forEach(value => excluded.add(value.toLowerCase()));
        }
        const seen = new Set<string>();
        const expanded: string[] = [];
        const manualRules = this.parseManualEnrichmentRules();
        const add = (value: string) => {
            const normalized = this.normalizeAiTagName(value);
            const key = normalized.toLowerCase();
            if (!normalized || seen.has(key) || excluded.has(key)) return;
            seen.add(key);
            expanded.push(normalized);
        };

        const expansionSources = [
            ...aiTags,
            ...(this.settings.filenameCandidateMode === "all" ? filenameCandidates : []),
            ...(this.settings.folderTagsCandidateMode === "all" ? folderTagCandidates : []),
        ];
        expansionSources.forEach(domain => {
            add(domain);
            const domainKey = this.normalizeAiTagName(domain).toLowerCase();

            manualRules.get(domainKey)?.forEach(target => add(target));

            manualRules.forEach((targets, source) => {
                if (this.tagContainsKnownVocabularyTerm(domain, source)) {
                    targets.forEach(target => add(target));
                }
            });


            if (this.settings.vaultLinguisticFeatures.compoundDecomposition === "use") {
                Array.from(this.vaultVocabulary.values())
                    .filter(entry => this.tagContainsKnownVocabularyTerm(domain, entry.name))
                    .sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name))
                    .forEach(entry => add(entry.name));
            }
        });

        return this.applyOllamaGeneratedTagsCap(expanded);
    }

    buildOllamaTagMessages(
        aiDescription: string,
        filenameCandidateHint: string,
        filenameMode: CandidateMode,
        folderTagCandidateHint: string,
        folderMode: CandidateMode
    ): { role: string; content: string }[] {
        return [
            {
                role: "system",
                content: [
                    "You create semantic search metadata for Obsidian image notes.",
                    'Respond with JSON only in this exact shape: {"aitags":["term"]}.',
                    this.getOllamaGeneratedTagsCap() === 0 ? "Use as many useful concise terms as are genuinely supported." : `Use concise terms and return at most ${this.getOllamaGeneratedTagsCap()} aitags.`,
                    "Prefer nouns and concepts visible or strongly implied by the description.",
                    "Add useful synonyms when they improve searchability, such as fortress for castle.",
                    "Do not use vault vocabulary yet; this pass creates base tags only.",
                    filenameMode === "all" ? "Filename keywords are an additional metadata source; use them to generate helpful tags and related broader concepts even when the image description is incomplete." : filenameMode === "consider" ? "Filename keywords are clues only; use them only when supported by the image description." : filenameMode === "exclude" ? "Do not use filename keywords as a source, and do not repeat exact filename keywords in aitags." : "Ignore filename keywords.",
                    folderMode === "all" ? "Folder tag keywords are an additional metadata source; use them to generate helpful tags and related broader concepts even when the image description is incomplete." : folderMode === "consider" ? "Folder tag keywords are clues only; use them only when supported by the image description or filename keywords." : folderMode === "exclude" ? "Do not use folder tag keywords as a source, and do not repeat exact current folder-derived keywords in aitags." : "Ignore folder tag keywords.",
                    "Reject candidates that are only common, recent, adjacent, or listed but not supported by the description or an allowed filename/folder source.",
                    "Do not include markdown, hashtags, explanations, paths, or duplicate terms.",
                ].join(" "),
            },
            {
                role: "user",
                content: [
                    "Image description:",
                    aiDescription.trim(),
                    "",
                    `Filename keyword candidates (${filenameMode}): ${filenameCandidateHint}`,
                    `Folder tag keyword candidates (${folderMode}): ${folderTagCandidateHint}`,
                    "",
                    filenameMode === "all" || folderMode === "all"
                        ? 'Return JSON only with terms supported by the image description and/or allowed keyword sources: {"aitags":["term1","term2"]}'
                        : 'Return JSON only with terms supported by the image description: {"aitags":["term1","term2"]}',
                ].join("\n"),
            },
        ];
    }


    getLinguisticPromptInstructions(features: LinguisticFeatureSettings): string[] {
        const instructions: string[] = [];
        const add = (mode: LinguisticFeatureMode, useText: string, excludeText: string) => {
            if (mode === "use") instructions.push(useText);
            if (mode === "exclude") instructions.push(excludeText);
        };

        add(features.synonyms, "Recognize direct synonyms and near-synonyms.", "Do not match concepts through synonyms or near-synonyms.");
        add(features.grammaticalVariants, "Recognize singular, plural, and grammatical variants.", "Do not match grammatical variants unless the configured term itself appears.");
        add(features.compoundDecomposition, "Recognize concepts contained in compounds and longer phrases.", "Do not decompose compounds to infer configured concepts.");
        add(features.vaultAliases, "Use supplied vault aliases as alternative names for their canonical concepts.", "Ignore vault aliases.");
        add(features.acronymsAbbreviations, "Recognize acronyms and abbreviations.", "Do not expand or infer acronyms and abbreviations.");
        add(features.spellingVariants, "Recognize common spelling, spacing, and hyphenation variants.", "Do not match alternate spellings, spacing, or hyphenation.");
        add(
            features.broaderNarrower,
            "A direct broader or narrower taxonomic concept may be accepted only when the category relationship is unmistakable and useful; avoid chains of generalization.",
            "Do not infer broader or narrower concepts; require the same concept."
        );
        add(features.canonicalization, "Prefer canonical vault concept names in the output.", "Do not replace output terms through canonicalization.");
        return instructions;
    }

    applyDeterministicSubjectBridgeTags(
        evidenceDomains: string[],
        aiDescription: string,
        filenameCandidates: string[],
        folderTagCandidates: string[]
    ): string[] {
        if (!this.settings.bridgeEnabled) return [];
        const evidenceText = [
            evidenceDomains.join(" "),
            aiDescription,
            filenameCandidates.join(" "),
            folderTagCandidates.join(" "),
        ].join(" ");
        const additions = new Map<string, string>();

        this.parseManualSubjectBridgeRules()
            .forEach(rule => {
                const matchedSources = rule.sources.filter(source =>
                    this.isConceptSupportedLocally(source, evidenceText, this.settings.bridgeLinguisticFeatures)
                );
                if (matchedSources.length === 0) return;

                [...matchedSources, ...rule.targets].forEach(term => {
                    const canonical = this.canonicalizeVaultTerm(term, this.settings.bridgeLinguisticFeatures.canonicalization === "use");
                    additions.set(canonical.toLowerCase(), canonical);
                });
            });

        return Array.from(additions.values());
    }

    async applySubjectBridgeTags(
        baseTags: string[],
        aiDescription: string,
        filenameCandidates: string[],
        folderTagCandidates: string[],
        endpoint: string,
        model: string
    ): Promise<string[]> {
        if (!this.settings.bridgeEnabled) return [];
        const evidenceText = [
            baseTags.join(" "),
            aiDescription,
            filenameCandidates.join(" "),
            folderTagCandidates.join(" "),
        ].join(" ");
        const rules = this.parseManualSubjectBridgeRules();
        const allSources = new Map<string, string>();
        rules.forEach(rule => rule.sources.forEach(source => allSources.set(source.toLowerCase(), source)));

        const normalizedEvidencePhrase = ` ${evidenceText.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
        const matchedSources = new Set<string>();
        const unmatchedSources: string[] = [];
        allSources.forEach((source, key) => {
            const normalizedSource = source.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
            const hasExactPhrase = normalizedSource.length > 0
                && normalizedEvidencePhrase.includes(` ${normalizedSource} `);
            if (hasExactPhrase || this.isConceptSupportedLocally(source, evidenceText, this.settings.bridgeLinguisticFeatures)) {
                matchedSources.add(key);
            } else {
                unmatchedSources.push(source);
            }
        });

        const semanticMatchingEnabled = Object.entries(this.settings.bridgeLinguisticFeatures)
            .some(([key, mode]) => key !== "canonicalization" && mode !== "exclude");
        if (unmatchedSources.length > 0 && semanticMatchingEnabled) {
            const sourceHint = unmatchedSources
                .map(source => {
                    if (this.settings.bridgeLinguisticFeatures.vaultAliases === "exclude") return source;
                    const canonical = this.canonicalizeVaultTerm(source, true);
                    const aliases = this.getVaultTermAliases(canonical);
                    return aliases.length > 0 ? `${source} (vault aliases: ${aliases.join(", ")})` : source;
                })
                .join(", ");
            const messages = [
                {
                    role: "system",
                    content: [
                        "You identify which configured source concepts are represented in image metadata.",
                        'Respond with JSON only in this exact shape: {"aitags":["source"]}.',
                        "Return only exact configured source names from the supplied list.",
                        "Assess every supplied source independently against all supplied evidence.",
                        "A source does not need to appear in Generated tags; the image description, filename keywords, and folder keywords are equally valid evidence.",
                        "When enabled below, return a configured source when the evidence uses a direct linguistic equivalent even if the source word itself never appears.",
                        ...this.getLinguisticPromptInstructions(this.settings.bridgeLinguisticFeatures),

                        "Accept literal occurrences and direct linguistic equivalents, but not merely related concepts.",
                        "When several configured sources overlap as synonyms, return only the closest equivalent unless multiple sources are explicitly present.",
                        "Do not accept concepts based merely on association, mood, co-occurrence, popularity, or recency.",
                        "Do not include explanations, markdown, paths, or duplicate terms.",
                    ].join(" "),
                },
                {
                    role: "user",
                    content: [
                        `Generated tags: ${baseTags.length > 0 ? baseTags.join(", ") : "none"}`,
                        "",
                        "Image description:",
                        aiDescription.trim() || "none",
                        "",
                        `Filename keywords: ${filenameCandidates.length > 0 ? filenameCandidates.join(", ") : "none"}`,
                        `Folder keywords: ${folderTagCandidates.length > 0 ? folderTagCandidates.join(", ") : "none"}`,
                        "",
                        `The only allowed output values are these configured source concepts: ${sourceHint}`,
                        "",
                        "Judge these source concepts against every evidence section above, not only Generated tags.",
                        'Return represented configured source concepts only: {"aitags":["source1","source2"]}',
                    ].join("\n"),
                },
            ];
            const requestVariants = this.buildOllamaTagRequestVariants(model, messages);

            for (let attempt = 0; attempt < requestVariants.length; attempt++) {
                try {
                    const response = await requestUrl({
                        url: endpoint,
                        method: "POST",
                        throw: false,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestVariants[attempt]),
                    });
                    if (response.status < 200 || response.status >= 300) continue;

                    const rawText = this.extractOllamaMessageText(response.json);
                    console.log(`Maru\'s Autotag bridge source matching raw response (attempt ${attempt + 1}):`, rawText);
                    let validSourceCount = 0;
                    this.parseAiTags(rawText).forEach(source => {
                        const key = source.toLowerCase();
                        if (allSources.has(key)) {
                            matchedSources.add(key);
                            validSourceCount++;
                        }
                    });
                    if (validSourceCount > 0 || rawText.trim() === '{"aitags":[]}' || this.isEmptyAiTagJsonResponse(rawText)) break;
                    console.warn("Maru\'s Autotag bridge matcher returned no configured sources; retrying with the next request format.", rawText);
                } catch (e) {
                    console.warn("Maru\'s Autotag bridge source matching attempt threw", {
                        attempt: attempt + 1,
                        model,
                        error: e instanceof Error ? e.message : String(e),
                    });
                }
            }
        }

        console.log("Maru\'s Autotag bridge matching:", {
            configuredRules: rules,
            locallyOrSemanticallyMatchedSources: Array.from(matchedSources),
        });

        const additions = new Map<string, string>();
        rules.forEach(rule => {
            const confirmedSources = rule.sources.filter(source => matchedSources.has(source.toLowerCase()));
            if (confirmedSources.length === 0) return;

            [...confirmedSources, ...rule.targets].forEach(term => {
                const canonical = this.canonicalizeVaultTerm(term, this.settings.bridgeLinguisticFeatures.canonicalization === "use");
                additions.set(canonical.toLowerCase(), canonical);
            });
        });

        const bridgeAdditions = Array.from(additions.values());
        console.log("Maru\'s Autotag bridge additions:", bridgeAdditions);
        return bridgeAdditions;
    }

    buildOllamaVaultAwarenessMessages(
        baseTags: string[],
        aiDescription: string,
        filenameCandidateHint: string,
        folderTagCandidateHint: string,
        vaultVocabularyHint: string
    ): { role: string; content: string }[] {
        return [
            {
                role: "system",
                content: [
                    "You select additional Obsidian semantic tags from known vault vocabulary.",
                    'Respond with JSON only in this exact shape: {"aitags":["term"]}.',
                    `Return at most ${this.settings.maxVaultAwareAdditions} additional known vault concepts that genuinely fit; returning none is correct when none are clearly evidenced.`,
                    "Use only terms or supplied aliases from the known vault vocabulary candidates.",
                    "Select concepts supported by the base domains, image description, active filename keywords, active folder tag keywords, or a manual enrichment rule source.",
                    ...this.getLinguisticPromptInstructions(this.settings.vaultLinguisticFeatures),

                    "Avoid category drift. Do not add concepts based merely on association, mood, style, genre, setting, co-occurrence, popularity, or recency.",
                    "Do not add a vault concept only because it is common, recent, or listed.",
                    "Do not include markdown, hashtags, explanations, paths, or duplicate terms.",
                ].join(" "),
            },
            {
                role: "user",
                content: [
                    `Base generated tags: ${baseTags.length > 0 ? baseTags.join(", ") : "none"}`,
                    "",
                    "Image description:",
                    aiDescription.trim() || "none",
                    "",
                    `Filename keyword candidates (${this.settings.filenameCandidateMode}): ${filenameCandidateHint}`,
                    `Folder tag keyword candidates (${this.settings.folderTagsCandidateMode}): ${folderTagCandidateHint}`,
                    `Known vault vocabulary candidates: ${vaultVocabularyHint}`,
                    "",
                    'Return JSON only with clearly evidenced known vault concepts, or an empty list: {"aitags":["term1","term2"]}',
                ].join("\n"),
            },
        ];
    }



    isManualRuleSupportedTerm(term: string, evidenceText: string): boolean {
        const normalizedTerm = this.normalizeAiTagName(term).toLowerCase();
        const normalizedEvidence = evidenceText.toLowerCase();

        for (const [source, targets] of this.parseManualEnrichmentRules().entries()) {
            const sourcePattern = new RegExp(`(^|\\W)${this.escapeRegex(source)}($|\\W)`, "i");
            const hasSourceEvidence = sourcePattern.test(normalizedEvidence);
            const hasTarget = targets.some(target => target.toLowerCase() === normalizedTerm);
            if (hasSourceEvidence && hasTarget) {
                return true;
            }
        }

        return false;
    }

    isVaultAwareTermSupported(
        term: string,
        baseTags: string[],
        aiDescription: string,
        filenameCandidates: string[],
        folderTagCandidates: string[]
    ): boolean {
        const evidenceText = [
            baseTags.join(" "),
            aiDescription,
            filenameCandidates.join(" "),
            folderTagCandidates.join(" "),
        ].join(" ");

        if (this.isConceptSupportedLocally(term, evidenceText, this.settings.vaultLinguisticFeatures)) return true;

        const canonical = this.canonicalizeVaultTerm(term, true);
        if (canonical.toLowerCase() !== term.toLowerCase()
            && this.isConceptSupportedLocally(canonical, evidenceText, this.settings.vaultLinguisticFeatures)) {
            return true;
        }

        if (this.settings.vaultLinguisticFeatures.vaultAliases !== "exclude") {
            const aliases = this.getVaultTermAliases(canonical);
            if (aliases.some(alias => this.isConceptSupportedLocally(alias, evidenceText, this.settings.vaultLinguisticFeatures))) {
                return true;
            }
        }

        return this.isManualRuleSupportedTerm(term, evidenceText)
            || this.isManualRuleSupportedTerm(canonical, evidenceText);
    }

    buildOllamaVaultAwarenessEvidenceGateMessages(
        proposedTerms: string[],
        baseTags: string[],
        aiDescription: string,
        filenameCandidates: string[],
        folderTagCandidates: string[]
    ): { role: string; content: string }[] {
        return [
            {
                role: "system",
                content: [
                    "You are a strict evidence gate for Obsidian image metadata.",
                    'Respond with JSON only in this exact shape: {"aitags":["term"]}.',
                    "Keep only proposed terms that are directly evidenced by the metadata.",
                    "The proposed terms are allowed vocabulary, not suggestions and not desired output.",
                    "Reject terms based merely on association, mood, style, genre, setting, co-occurrence, popularity, recency, or because they appeared in a candidate list.",
                    "For synonyms, aliases, spelling variants, compounds, acronyms, and grammatical variants, accept only close equivalents that a human would see as the same visible or described concept.",
                    "For broader or narrower concepts, accept only an immediate category relationship that is unmistakably supported by the evidence; avoid chains of generalization.",
                    "Return only exact proposed terms. If none are clearly supported, return an empty aitags array.",
                ].join(" "),
            },
            {
                role: "user",
                content: [
                    `Base generated tags: ${baseTags.length > 0 ? baseTags.join(", ") : "none"}`,
                    "",
                    "Image description:",
                    aiDescription.trim() || "none",
                    "",
                    `Filename keywords: ${filenameCandidates.length > 0 ? filenameCandidates.join(", ") : "none"}`,
                    `Folder keywords: ${folderTagCandidates.length > 0 ? folderTagCandidates.join(", ") : "none"}`,
                    `Proposed vault terms to verify: ${proposedTerms.join(", ")}`,
                    "",
                    'Return only the proposed terms with clear evidence: {"aitags":["term1","term2"]}',
                ].join("\n"),
            },
        ];
    }

    async filterVaultAwareSelections(
        selected: string[],
        rankedVocabularyTerms: string[],
        baseTags: string[],
        aiDescription: string,
        filenameCandidates: string[],
        folderTagCandidates: string[],
        endpoint: string,
        model: string
    ): Promise<string[]> {
        const allowed = new Map<string, string>();
        rankedVocabularyTerms.forEach(term => {
            allowed.set(term.toLowerCase(), term);
            if (this.settings.vaultLinguisticFeatures.vaultAliases !== "exclude") {
                this.getVaultTermAliases(term).forEach(alias => allowed.set(alias.toLowerCase(), alias));
            }
        });

        const accepted = new Map<string, string>();
        const needsEvidenceGate = new Map<string, string>();
        selected.forEach(term => {
            const normalized = this.normalizeAiTagName(term);
            if (!normalized) return;

            const output = this.settings.vaultLinguisticFeatures.canonicalization === "use"
                ? this.canonicalizeVaultTerm(normalized, true)
                : normalized;
            if (!allowed.has(normalized.toLowerCase()) && !allowed.has(output.toLowerCase())) return;

            if (this.isVaultAwareTermSupported(output, baseTags, aiDescription, filenameCandidates, folderTagCandidates)
                || this.isVaultAwareTermSupported(normalized, baseTags, aiDescription, filenameCandidates, folderTagCandidates)) {
                accepted.set(output.toLowerCase(), output);
                return;
            }

            needsEvidenceGate.set(output.toLowerCase(), output);
        });

        if (needsEvidenceGate.size === 0) {
            return Array.from(accepted.values()).slice(0, this.settings.maxVaultAwareAdditions);
        }

        const proposedTerms = Array.from(needsEvidenceGate.values());
        const messages = this.buildOllamaVaultAwarenessEvidenceGateMessages(
            proposedTerms,
            baseTags,
            aiDescription,
            filenameCandidates,
            folderTagCandidates
        );
        const requestVariants = this.buildOllamaTagRequestVariants(model, messages);
        const proposed = new Map(proposedTerms.map(term => [term.toLowerCase(), term]));

        for (let attempt = 0; attempt < requestVariants.length; attempt++) {
            try {
                const response = await requestUrl({
                    url: endpoint,
                    method: "POST",
                    throw: false,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestVariants[attempt]),
                });
                if (response.status < 200 || response.status >= 300) continue;

                const rawText = this.extractOllamaMessageText(response.json);
                console.log(`Maru\'s Autotag vault evidence gate raw response (attempt ${attempt + 1}):`, rawText);
                const confirmed = this.parseAiTags(rawText);
                confirmed.forEach(term => {
                    const normalized = this.normalizeAiTagName(term);
                    const proposedTerm = proposed.get(normalized.toLowerCase());
                    if (proposedTerm) {
                        accepted.set(proposedTerm.toLowerCase(), proposedTerm);
                    }
                });
                if (rawText.trim()) break;
            } catch (e) {
                console.warn("Maru\'s Autotag vault evidence gate attempt threw", {
                    attempt: attempt + 1,
                    model,
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }

        return Array.from(accepted.values()).slice(0, this.settings.maxVaultAwareAdditions);
    }

    async selectVaultAwareTags(
        baseTags: string[],
        aiDescription: string,
        filenameCandidates: string[],
        folderTagCandidates: string[],
        endpoint: string,
        model: string
    ): Promise<string[]> {
        if (!this.settings.vaultAwarenessEnabled) {
            return [];
        }

        const rankedVocabularyTerms = this.getRankedVaultVocabularyTerms(
            `${aiDescription} ${baseTags.join(" ")}`,
            filenameCandidates,
            folderTagCandidates
        );
        const vaultVocabularyHint = rankedVocabularyTerms.length > 0
            ? rankedVocabularyTerms.map(term => this.settings.vaultLinguisticFeatures.vaultAliases !== "exclude" ? this.getVaultPromptLabel(term) : term).join(", ")
            : "none";
        const filenameCandidateHint = filenameCandidates.length > 0 ? filenameCandidates.join(", ") : "none";
        const folderTagCandidateHint = folderTagCandidates.length > 0 ? folderTagCandidates.join(", ") : "none";

        console.log("Maru\'s Autotag vault candidates:", rankedVocabularyTerms);
        if (rankedVocabularyTerms.length === 0) {
            return [];
        }

        const messages = this.buildOllamaVaultAwarenessMessages(
            baseTags,
            aiDescription,
            filenameCandidateHint,
            folderTagCandidateHint,
            vaultVocabularyHint
        );
        const requestVariants = this.buildOllamaTagRequestVariants(model, messages);

        for (let attempt = 0; attempt < requestVariants.length; attempt++) {
            try {
                const response = await requestUrl({
                    url: endpoint,
                    method: "POST",
                    throw: false,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestVariants[attempt]),
                });

                if (response.status < 200 || response.status >= 300) {
                    console.warn("Maru\'s Autotag vault awareness attempt failed", {
                        attempt: attempt + 1,
                        model,
                        status: response.status,
                        body: response.text?.slice(0, 300) || "no response body",
                    });
                    continue;
                }

                const rawText = this.extractOllamaMessageText(response.json);
                console.log(`Maru\'s Autotag vault awareness raw response (attempt ${attempt + 1}):`, rawText);
                const selected = this.parseAiTags(rawText);
                if (selected.length > 0) {
                    return await this.filterVaultAwareSelections(
                        selected,
                        rankedVocabularyTerms,
                        baseTags,
                        aiDescription,
                        filenameCandidates,
                        folderTagCandidates,
                        endpoint,
                        model
                    );
                }
            } catch (e) {
                console.warn("Maru\'s Autotag vault awareness attempt threw", {
                    attempt: attempt + 1,
                    model,
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }

        return [];
    }
    buildOllamaTagRequestVariants(
        model: string,
        messages: { role: string; content: string }[]
    ): Record<string, unknown>[] {
        const base = {
            model,
            stream: false,
            options: {
                temperature: 0.2,
                num_predict: 256,
            },
            messages,
        };

        const variants: Record<string, unknown>[] = [
            { ...base, format: "json", ...( /qwen3/i.test(model) ? { think: false } : {} ) },
            { ...base, format: "json" },
            { ...base, ...( /qwen3/i.test(model) ? { think: false } : {} ) },
            { ...base },
        ];

        const seen = new Set<string>();
        return variants.filter(variant => {
            const key = JSON.stringify(variant);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async generateAiTags(
        aiDescription: string | null,
        folderCandidateValues: string[],
        file: TFile | null = null
    ): Promise<GeneratedAiTagResult> {
        if (!this.settings.aiTaggingEnabled) {
            return { aiTags: [], vaultAwarenessTags: [] };
        }

        const filenameCandidates = this.getFilenameKeywordCandidates(file);
        const folderTagCandidates = this.getFolderTagCandidates(folderCandidateValues);
        const activeFilenameCandidates = this.isCandidateSourceActive(this.settings.filenameCandidateMode) ? filenameCandidates : [];
        const activeFolderTagCandidates = this.isCandidateSourceActive(this.settings.folderTagsCandidateMode) ? folderTagCandidates : [];
        const descriptionText = aiDescription?.trim() ?? "";
        const canUseFilenameOnly = this.settings.filenameCandidateMode === "all" && filenameCandidates.length > 0;
        const canUseFolderOnly = this.settings.folderTagsCandidateMode === "all" && folderTagCandidates.length > 0;

        if (!descriptionText && !canUseFilenameOnly && !canUseFolderOnly) {
            return { aiTags: [], vaultAwarenessTags: [] };
        }

        const endpoint = this.getOllamaChatUrl();
        const model = this.settings.ollamaModel.trim();

        if (!endpoint || !model) {
            new Notice("Ollama settings are incomplete");
            return { aiTags: [], vaultAwarenessTags: [] };
        }

        const filenameCandidateHint = activeFilenameCandidates.length > 0 ? activeFilenameCandidates.join(", ") : "none";
        const folderTagCandidateHint = activeFolderTagCandidates.length > 0 ? activeFolderTagCandidates.join(", ") : "none";
        console.log("Maru\'s Autotag filename candidates:", filenameCandidates);
        console.log("Maru\'s Autotag folder tag candidates:", folderTagCandidates);
        const messages = this.buildOllamaTagMessages(
            descriptionText,
            filenameCandidateHint,
            this.settings.filenameCandidateMode,
            folderTagCandidateHint,
            this.settings.folderTagsCandidateMode
        );
        const requestVariants = this.buildOllamaTagRequestVariants(model, messages);

        let lastError = "unknown error";
        let lastRawText = "";

        for (let attempt = 0; attempt < requestVariants.length; attempt++) {
            const requestBody = requestVariants[attempt];

            try {
                const response = await requestUrl({
                    url: endpoint,
                    method: "POST",
                    throw: false,
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                });

                if (response.status < 200 || response.status >= 300) {
                    lastError = `HTTP ${response.status}: ${response.text?.slice(0, 300) || "no response body"}`;
                    console.warn("Maru\'s Autotag Ollama attempt failed", {
                        attempt: attempt + 1,
                        model,
                        status: response.status,
                        body: lastError,
                        requestBody,
                    });
                    continue;
                }

                const rawText = this.extractOllamaMessageText(response.json);
                lastRawText = rawText;
                console.log(`Maru\'s Autotag Ollama raw response (attempt ${attempt + 1}):`, rawText);

                const tags = this.parseAiTags(rawText);
                if (tags.length > 0) {
                    const canonicalTags = tags.map(tag =>
                        this.canonicalizeVaultTerm(tag, this.settings.vaultLinguisticFeatures.canonicalization === "use")
                    );
                    const bridgeTags = await this.applySubjectBridgeTags(canonicalTags, descriptionText, activeFilenameCandidates, activeFolderTagCandidates, endpoint, model);
                    const tagsWithBridges = [...canonicalTags, ...bridgeTags];
                    const vaultTags = await this.selectVaultAwareTags(tagsWithBridges, descriptionText, activeFilenameCandidates, activeFolderTagCandidates, endpoint, model);
                    const postVaultBridgeTags = this.settings.bridgeUsePreBridgeVaultAwarenessOutput
                        ? this.applyDeterministicSubjectBridgeTags(
                            [...tagsWithBridges, ...vaultTags],
                            descriptionText,
                            activeFilenameCandidates,
                            activeFolderTagCandidates
                        )
                        : [];
                    const vaultAwarenessTags = this.normalizeUniqueAiTags([...vaultTags, ...postVaultBridgeTags]);
                    const includeVaultAwarenessInAiTags = !this.settings.vaultAwarenessOutputEnabled || !this.settings.vaultAwarenessOutputExclusive;
                    const aiTagInputs = includeVaultAwarenessInAiTags
                        ? [...tagsWithBridges, ...vaultAwarenessTags]
                        : tagsWithBridges;
                    const excludedVaultAwarenessTags = new Set(
                        includeVaultAwarenessInAiTags
                            ? []
                            : vaultAwarenessTags.map(tag => tag.toLowerCase())
                    );
                    const aiTags = this.expandAiTagsWithKnownVocabulary(aiTagInputs, filenameCandidates, folderTagCandidates)
                        .filter(tag => !excludedVaultAwarenessTags.has(tag.toLowerCase()));

                    return { aiTags, vaultAwarenessTags };
                }

                if (rawText.trim()) {
                    lastError = "response contained no parseable aitags";
                    console.warn("Maru\'s Autotag: Ollama returned text but no aitags were parsed", rawText);
                } else {
                    lastError = "empty Ollama response";
                }
            } catch (e) {
                lastError = e instanceof Error ? e.message : String(e);
                console.warn("Maru\'s Autotag Ollama attempt threw", {
                    attempt: attempt + 1,
                    model,
                    error: lastError,
                });
            }
        }

        console.error("Maru\'s Autotag: all Ollama tag attempts failed", {
            model,
            lastError,
            lastRawText,
        });
        new Notice(`Ollama semantic tags failed for ${model} - check console`);
        return { aiTags: [], vaultAwarenessTags: [] };
    }

    stripThinkBlocks(text: string): string {
        return text
            .replace(/<think[\s\S]*?<\/think>\s*/gi, "")
            .replace(/<redacted_reasoning[\s\S]*?<\/redacted_reasoning>\s*/gi, "")
            .trim();
    }

    extractOllamaMessageText(responseJson: unknown): string {
        const message = (responseJson as { message?: { content?: unknown; thinking?: unknown } })?.message;
        if (!message) {
            return "";
        }

        const content = typeof message.content === "string"
            ? this.stripThinkBlocks(message.content)
            : "";
        const thinking = typeof message.thinking === "string"
            ? message.thinking.trim()
            : "";

        return content || thinking;
    }

    getOllamaBaseUrl(): string {
        return this.settings.ollamaBaseUrl.trim().replace(/\/$/, "");
    }

    getOllamaChatUrl(): string {
        return `${this.getOllamaBaseUrl()}/api/chat`;
    }

    getOllamaTagsUrl(): string {
        return `${this.getOllamaBaseUrl()}/api/tags`;
    }

    getOllamaPullUrl(): string {
        return `${this.getOllamaBaseUrl()}/api/pull`;
    }

    getOllamaDeleteUrl(): string {
        return `${this.getOllamaBaseUrl()}/api/delete`;
    }

    async listPulledOllamaModels(): Promise<string[]> {
        try {
            const response = await requestUrl({
                url: this.getOllamaTagsUrl(),
                method: "GET",
            });

            if (response.status < 200 || response.status >= 300) {
                throw new Error(`Ollama model list failed with status ${response.status}`);
            }

            const models = response.json?.models;
            if (!Array.isArray(models)) {
                return [];
            }

            return models
                .map((model: any) => model?.name)
                .filter((name: unknown): name is string => typeof name === "string")
                .sort((a, b) => a.localeCompare(b));
        } catch (e) {
            console.error("Could not list Ollama models", e);
            return [];
        }
    }

    async pullOllamaModel(modelName: string): Promise<boolean> {
        try {
            const response = await requestUrl({
                url: this.getOllamaPullUrl(),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: modelName,
                    stream: false,
                }),
            });

            if (response.status < 200 || response.status >= 300) {
                throw new Error(`Ollama model pull failed with status ${response.status}`);
            }

            return true;
        } catch (e) {
            console.error("Could not pull Ollama model", e);
            return false;
        }
    }

    async removeOllamaModel(modelName: string): Promise<boolean> {
        try {
            const response = await requestUrl({
                url: this.getOllamaDeleteUrl(),
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: modelName,
                }),
            });

            if (response.status < 200 || response.status >= 300) {
                throw new Error(`Ollama model removal failed with status ${response.status}`);
            }

            return true;
        } catch (e) {
            console.error("Could not remove Ollama model", e);
            return false;
        }
    }

    parseAiTags(content: unknown): string[] {
        if (typeof content !== "string" || !content.trim()) {
            return [];
        }

        const cleaned = this.stripThinkBlocks(content)
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const parsedValues = this.tryParseAiTagValues(cleaned);
        if (parsedValues.length > 0) {
            return this.normalizeAiTagValues(parsedValues);
        }
        if (this.isEmptyAiTagJsonResponse(cleaned)) {
            return [];
        }

        const arrayMatch = cleaned.match(/"aitags"\s*:\s*(\[[\s\S]*?\])/i);
        if (arrayMatch) {
            try {
                const values = JSON.parse(arrayMatch[1]);
                if (Array.isArray(values)) {
                    return this.normalizeAiTagValues(values);
                }
            } catch (e) {
                console.error("Could not parse aitags array fallback", e, arrayMatch[1]);
            }
        }

        console.error("Could not parse Ollama semantic tags", content);
        return [];
    }

    tryParseAiTagValues(cleaned: string): unknown[] {
        try {
            const jsonStart = cleaned.indexOf("{");
            const jsonEnd = cleaned.lastIndexOf("}");
            const jsonText = jsonStart === -1 || jsonEnd === -1
                ? cleaned
                : cleaned.slice(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonText);

            if (Array.isArray(parsed)) {
                return parsed;
            }

            const values = parsed?.aitags ?? parsed?.tags;
            return Array.isArray(values) ? values : [];
        } catch {
            return [];
        }
    }

    isEmptyAiTagJsonResponse(cleaned: string): boolean {
        try {
            const jsonStart = cleaned.indexOf("{");
            const jsonEnd = cleaned.lastIndexOf("}");
            if (jsonStart === -1 || jsonEnd === -1) return false;
            const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
            return !!parsed
                && typeof parsed === "object"
                && !Array.isArray(parsed)
                && Object.keys(parsed).length === 0;
        } catch {
            return false;
        }
    }

    normalizeAiTagName(value: string): string {
        return value
            .trim()
            .replace(/^#/, "")
            .replace(/^\[\[/, "")
            .replace(/\]\]$/, "")
            .replace(/\s+/g, " ")
            .split(" ")
            .map(part => part.length === 0
                ? part
                : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ");
    }


    getOllamaGeneratedTagsCap(): number {
        const cap = Number(this.settings.ollamaGeneratedTagsCap);
        if (!Number.isFinite(cap) || cap < 0) {
            return DEFAULT_SETTINGS.ollamaGeneratedTagsCap;
        }

        return Math.round(cap);
    }

    applyOllamaGeneratedTagsCap(values: string[]): string[] {
        const cap = this.getOllamaGeneratedTagsCap();
        return cap === 0 ? values : values.slice(0, cap);
    }
    normalizeAiTagValues(values: unknown[]): string[] {
        const seen = new Set<string>();

        return values
            .filter((value): value is string => typeof value === "string")
            .map(value => this.normalizeAiTagName(value))
            .filter(value => value.length > 0 && value.length <= 48)
            .filter(value => {
                const key = value.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    formatYamlBlock(value: string | null, fallback: string): string {
        const text = (value?.trim() || fallback).replace(/\r\n/g, '\n');
        return text
            .split('\n')
            .map(line => `  ${line}`)
            .join('\n');
    }

    applyFormatExampleCasing(value: string, placeholder: string): string {
        if (placeholder === "example") return value.toLowerCase();
        if (placeholder === "EXAMPLE") return value.toUpperCase();
        return value;
    }

    formatValueWithTemplate(value: string, format: string | undefined): string {
        const trimmedFormat = (format ?? "").trim();
        if (!trimmedFormat) {
            return value;
        }

        return /example/i.test(trimmedFormat)
            ? trimmedFormat.replace(/example/gi, placeholder => this.applyFormatExampleCasing(value, placeholder))
            : `${trimmedFormat}${value}`;
    }

    formatYamlListItem(value: string, format: string | undefined): string {
        const trimmedFormat = (format ?? "").trim();
        const formattedValue = this.formatValueWithTemplate(value, trimmedFormat);
        return trimmedFormat
            ? `- ${JSON.stringify(formattedValue)}`
            : `- ${formattedValue}`;
    }

    formatYamlList(values: string[], format: string | undefined = ""): string {
        if (values.length === 0) {
            return "";
        }

        return values
            .map(value => this.formatYamlListItem(value, format))
            .join('\n');
    }

    getFormatPreview(format: string | undefined): string {
        return this.formatValueWithTemplate("Example", format);
    }

    sleep(ms: number): Promise<void> {
        return new Promise(resolve => window.setTimeout(resolve, ms));
    }
    getFailedFile(path: string): FailedProcessingFile | undefined {
        return this.settings.failedFiles.find(file => file.path === path);
    }

    hasReachedMaxAttempts(path: string): boolean {
        const failedFile = this.getFailedFile(path);
        return !!failedFile && failedFile.attempts >= this.settings.maxProcessingAttempts;
    }

    clearFailedFile(path: string): boolean {
        const index = this.settings.failedFiles.findIndex(file => file.path === path);
        if (index !== -1) {
            this.settings.failedFiles.splice(index, 1);
            return true;
        }
        return false;
    }
    getProtectedJob(path: string): ProtectedProcessingJob | undefined {
        return this.settings.protectedJobs.find(job => job.path === path);
    }

    upsertProtectedJob(path: string, updates: Partial<ProtectedProcessingJob>): void {
        if (!this.settings.shutdownProtectionEnabled) return;
        const now = Date.now();
        const existing = this.getProtectedJob(path);
        if (existing) {
            Object.assign(existing, updates, { updatedAt: now });
        } else {
            this.settings.protectedJobs.push({
                path,
                stage: updates.stage ?? "queued",
                queuedAt: updates.queuedAt ?? now,
                updatedAt: now,
                source: updates.source ?? "shutdown",
                ...updates,
            });
        }
    }

    removeProtectedJob(path: string): boolean {
        const before = this.settings.protectedJobs.length;
        this.settings.protectedJobs = this.settings.protectedJobs.filter(job => job.path !== path);
        return this.settings.protectedJobs.length !== before;
    }

    updatePendingGeocodeJobsForRename(oldPath: string, newPath: string): boolean {
        let changed = false;
        this.settings.pendingGeocodeJobs = this.settings.pendingGeocodeJobs.map(job => {
            const updated = { ...job };
            if (updated.imagePath === oldPath) {
                updated.imagePath = newPath;
                changed = true;
            }
            if (updated.notePath === oldPath) {
                updated.notePath = newPath;
                changed = true;
            }
            return updated;
        });
        return changed;
    }

    updateProtectedJobPath(oldPath: string, newPath: string, newNotePath?: string): boolean {
        const job = this.getProtectedJob(oldPath);
        if (!job) return false;
        job.path = newPath;
        if (newNotePath) job.notePath = newNotePath;
        job.updatedAt = Date.now();
        return true;
    }

    async saveProtectedJob(path: string, updates: Partial<ProtectedProcessingJob>): Promise<void> {
        if (!this.settings.shutdownProtectionEnabled) return;
        this.upsertProtectedJob(path, updates);
        await this.saveSettings();
    }

    async resumeProtectedJobs(): Promise<void> {
        if (!this.settings.shutdownProtectionEnabled) return;
        const jobs = [...this.settings.protectedJobs]
            .sort((a, b) => a.queuedAt - b.queuedAt);
        let resumed = 0;
        let shutdownResumed = 0;
        let manualVaultResumed = 0;
        let removed = 0;

        for (const job of jobs) {
            if (this.settings.processedFiles.includes(job.path)) {
                if (this.removeProtectedJob(job.path)) removed += 1;
                continue;
            }
            if (this.hasReachedMaxAttempts(job.path)) {
                continue;
            }
            const file = this.app.vault.getAbstractFileByPath(job.path);
            if (file instanceof TFile) {
                const source = job.source ?? "shutdown";
                this.enqueueFile(file, true, source);
                resumed += 1;
                if (source === "manual-vault-reprocess") manualVaultResumed += 1;
                else shutdownResumed += 1;
            } else if (this.removeProtectedJob(job.path)) {
                removed += 1;
            }
        }

        if (removed > 0) await this.saveSettings();
        if (shutdownResumed > 0) {
            new Notice(`Maru\'s Autotag Shutdown Protection resumed ${shutdownResumed} file${shutdownResumed === 1 ? "" : "s"}.`);
        }
        if (manualVaultResumed > 0) {
            new Notice(`Maru\'s Autotag resumed ${manualVaultResumed} manually queued vault file${manualVaultResumed === 1 ? "" : "s"}.`);
        }
    }
    getFailureCategory(reason: string): string {
        const normalized = reason.toLowerCase();
        if (normalized.includes("bfm note not found")) return "BFM companion note not found";
        if (normalized.includes("ai image analyzer returned no description")) return "AI Image Analyzer returned no description";
        if (normalized.includes("ollama did not return")) return "Ollama returned no AI tags";
        if (normalized.includes("could not load image") || normalized.includes("visual duplicate hash failed")) return "Image preview or visual hash failed";
        if (normalized.includes("permission") || normalized.includes("eperm") || normalized.includes("access") || normalized.includes("denied")) return "File permission or sync lock";
        if (normalized.includes("failed to fetch") || normalized.includes("econnrefused") || normalized.includes("network") || normalized.includes("ollama")) return "Local Ollama connection failed";
        if (normalized.includes("yaml") || normalized.includes("frontmatter") || normalized.includes("parse")) return "Template or frontmatter parsing problem";
        return "Unexpected processing error";
    }

    getFailureSolutions(reason: string): string[] {
        const category = this.getFailureCategory(reason);
        if (category === "BFM companion note not found") {
            return [
                "Check that Binary File Manager and Maru\'s Autotag use the same companion-note folder.",
                "Check that BFM File name format in Autotag exactly matches BFM's metadata filename format, including prefixes, suffixes and casing.",
                "Increase the BFM note wait time if BFM creates notes slowly.",
                "Make sure BFM actually created the companion note for this image.",
            ];
        }
        if (category === "AI Image Analyzer returned no description") {
            return [
                "Check that AI Image Analyzer is enabled and can analyze this image type.",
                "Try opening AI Image Analyzer directly on the image to see whether it returns a description.",
                "If filename or folder keyword fallback should be enough, check those candidate modes in Autotag settings.",
            ];
        }
        if (category === "Ollama returned no AI tags") {
            return [
                "Check that Ollama is running locally.",
                "Check that the selected model is pulled and available in Ollama.",
                "Try a smaller or more reliable tagging model if the response is empty or malformed.",
                "Reduce prompt pressure by lowering candidate vocabulary or generated tag caps if responses become unstable.",
            ];
        }
        if (category === "Image preview or visual hash failed") {
            return [
                "Check that the file is a readable image and still exists in the vault.",
                "Try turning duplicate visual similarity off and using exact duplicates only.",
                "Check whether the image format is unusual or corrupted.",
            ];
        }
        if (category === "File permission or sync lock") {
            return [
                "Wait for sync software to finish and retry failed files.",
                "Check whether Obsidian can edit the companion note manually.",
                "Check whether the image or note is locked by another program.",
            ];
        }
        if (category === "Local Ollama connection failed") {
            return [
                "Start Ollama and confirm the local URL in Autotag settings.",
                "Check that the URL is usually http://127.0.0.1:11434 unless you intentionally changed it.",
                "Try pulling or selecting a model again from the Autotag settings.",
            ];
        }
        if (category === "Template or frontmatter parsing problem") {
            return [
                "Check the Frontmatter Template for invalid YAML.",
                "Try a very small template first, then add custom properties back gradually.",
                "Remember that plugin-generated properties are overwritten, while property-list values are additive.",
            ];
        }
        return [
            "Retry the failed file once after checking that the companion note exists.",
            "Open the developer console and look for the full Maru\'s Autotag error near the time of failure.",
            "If the same file fails repeatedly, copy the failed-file list and inspect the exact reason text.",
        ];
    }

    getFailureNoticeText(file: TFile, reason: string, attempts: number): string {
        const category = this.getFailureCategory(reason);
        return `Maru\'s Autotag failed (${attempts}/${this.settings.maxProcessingAttempts}): ${category} - ${file.name}`;
    }

    buildFailureHelpNoteContent(): string {
        const recentFailures = [...this.settings.failedFiles]
            .sort((a, b) => b.lastFailedAt - a.lastFailedAt)
            .slice(0, 10);
        const lines = [
            "# Maru\'s Autotag Failure Help",
            "",
            "This note was generated by Maru\'s Autotag. You may delete it after reading.",
            "",
            recentFailures.length > 0
                ? `Recent failed files: ${recentFailures.length}`
                : "No failed files are currently tracked.",
            "",
        ];

        if (recentFailures.length === 0) {
            lines.push("## General Checks", "", "- Check that Binary File Manager and Maru\'s Autotag use matching folder and filename settings.", "- Check that AI Image Analyzer and Ollama are enabled only when you want them used.", "- Check the developer console if something stops without a visible notice.", "");
            return lines.join("\n");
        }

        recentFailures.forEach((failure, index) => {
            const failedAt = failure.lastFailedAt ? new Date(failure.lastFailedAt).toLocaleString() : "unknown time";
            lines.push(
                `## ${index + 1}. ${failure.path}`,
                "",
                `Category: ${this.getFailureCategory(failure.reason)}`,
                `Attempts: ${failure.attempts}/${this.settings.maxProcessingAttempts}`,
                `Last failed: ${failedAt}`,
                `Reason: ${failure.reason}`,
                "",
                "Most likely fixes:",
                ...this.getFailureSolutions(failure.reason).map(solution => `- ${solution}`),
                ""
            );
        });

        return lines.join("\n");
    }

    async openFailureHelpNote(): Promise<void> {
        const notePath = "Maru\'s Autotag Failure Help.md";
        const content = this.buildFailureHelpNoteContent();
        const existing = this.app.vault.getAbstractFileByPath(notePath);
        let note: TFile;
        if (existing instanceof TFile) {
            await this.app.vault.modify(existing, content);
            note = existing;
        } else {
            note = await this.app.vault.create(notePath, content);
        }
        await this.app.workspace.getLeaf(false).openFile(note);
        new Notice("Maru\'s Autotag failure help note opened. You may delete it after reading.");
    }

    async recordProcessingFailure(file: TFile, reason: string, shouldRetry = true): Promise<void> {
        const existing = this.getFailedFile(file.path);
        if (existing) {
            existing.reason = reason;
            existing.attempts += 1;
            existing.lastFailedAt = Date.now();
        } else {
            this.settings.failedFiles.push({
                path: file.path,
                reason,
                attempts: 1,
                lastFailedAt: Date.now(),
            });
        }

        await this.saveSettings();

        const failedFile = this.getFailedFile(file.path);
        const attempts = failedFile?.attempts ?? 1;
        new Notice(this.getFailureNoticeText(file, reason, attempts), 8000);
        if (shouldRetry && attempts < this.settings.maxProcessingAttempts) {
            this.enqueueFile(file, true);
        } else if (shouldRetry) {
            new Notice(`Maru\'s Autotag stopped retrying. Open the failure help note for likely fixes: ${file.name}`, 10000);
        }
    }

    async retryFailedFiles(): Promise<void> {
        const failedFiles = [...this.settings.failedFiles];
        let queued = 0;

        for (const failedFile of failedFiles) {
            const file = this.app.vault.getAbstractFileByPath(failedFile.path);
            if (file instanceof TFile) {
                failedFile.attempts = 0;
                failedFile.reason = "Manual retry requested";
                failedFile.lastFailedAt = Date.now();
                this.enqueueFile(file, true);
                queued += 1;
            }
        }

        await this.saveSettings();
        new Notice(`Queued ${queued} failed file${queued === 1 ? "" : "s"} for retry.`);
    }

    async clearFailedFiles(): Promise<void> {
        const count = this.settings.failedFiles.length;
        this.settings.failedFiles = [];
        await this.saveSettings();
        new Notice(`Cleared ${count} failed file${count === 1 ? "" : "s"}.`);
    }
    buildForgottenFilesNoteContent(files: TFile[], missingPaths: string[], totalProcessedBefore: number): string {
        const timestamp = new Date().toLocaleString();
        const lines = [
            "# Maru\'s Autotag Forgotten Files",
            "",
            `Created: ${timestamp}`,
            "",
            "This note was created when Forget All Processed Files was used. You may delete it after reviewing.",
            "",
            "## Summary",
            "",
            `- Processed files before forgetting: ${totalProcessedBefore}`,
            `- Existing file paths found: ${files.length}`,
            `- Missing file paths skipped: ${missingPaths.length}`,
            `- Companion notes are listed from the current BFM File name format setting.`,
            "",
            "## Previously Processed Files",
            "",
        ];

        files.forEach(file => {
            lines.push(`- [[${file.path}]]`, `- [[${this.getBfmNotePath(file)}]]`);
        });

        if (missingPaths.length > 0) {
            lines.push("", "## Missing Paths", "");
            missingPaths.forEach(path => lines.push(`- ${path}`));
        }

        return lines.join("\n");
    }

    async createForgottenFilesNote(files: TFile[], missingPaths: string[], totalProcessedBefore: number): Promise<void> {
        const notePath = "Maru\'s Autotag Forgotten Files.md";
        const content = this.buildForgottenFilesNoteContent(files, missingPaths, totalProcessedBefore);
        const existing = this.app.vault.getAbstractFileByPath(notePath);
        if (existing instanceof TFile) {
            await this.app.vault.modify(existing, content);
        } else {
            await this.app.vault.create(notePath, content);
        }
    }

    async forgetAllProcessedFiles(): Promise<void> {
        const processedPaths = [...this.settings.processedFiles];
        const files: TFile[] = [];
        const missingPaths: string[] = [];

        processedPaths.forEach(path => {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) files.push(file);
            else missingPaths.push(path);
        });

        await this.createForgottenFilesNote(files, missingPaths, processedPaths.length);
        this.settings.processedFiles = [];
        await this.saveSettings();

        new Notice(`Forgot ${processedPaths.length} processed file${processedPaths.length === 1 ? "" : "s"}. A summary note was created. Use Process Unprocessed Files when you want to queue them again.`);
    }

    getUnprocessedBaseFiles(): TFile[] {
        const processedPaths = new Set(this.settings.processedFiles);
        const protectedPaths = new Set(this.settings.protectedJobs.map(job => job.path));
        return this.getHashableBaseFiles().filter(file =>
            !processedPaths.has(file.path)
            && !this.getFailedFile(file.path)
            && !protectedPaths.has(file.path)
        );
    }

    async processUnprocessedBaseFiles(silentWhenEmpty = false): Promise<void> {
        const files = this.getUnprocessedBaseFiles();
        const total = files.length;
        if (total === 0 && silentWhenEmpty) return;

        const progress = this.showProgressNotice(
            "Processing unprocessed files",
            total > 0 ? `Queueing 0/${total}` : "No unprocessed files found.",
            Math.max(1, total)
        );

        if (total === 0) {
            progress.setProgress(1, "No unprocessed files found.");
            window.setTimeout(() => progress.hide(), 1600);
            return;
        }

        for (let index = 0; index < files.length; index += 1) {
            this.enqueueFile(files[index], true, "manual-vault-reprocess");
            progress.setProgress(index + 1, `Queued ${index + 1}/${total}`);
            if ((index + 1) % 20 === 0) await this.sleep(1);
        }

        await this.saveSettings();
        progress.setProgress(total, `Queued ${total} file${total === 1 ? "" : "s"} for processing.`);
        window.setTimeout(() => progress.hide(), 2200);
        new Notice(`Queued ${total} unprocessed file${total === 1 ? "" : "s"} from the watched folder.`);
    }

    async processSingleFileAgain(path: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile) || file.extension.toLowerCase() === "md" || !file.path.startsWith(this.settings.basePath)) {
            new Notice("Select an image/source file inside the watched Base Path.");
            return;
        }
        if (this.isPathProcessing(file.path)) {
            new Notice(`${file.name} is already queued or processing.`);
            return;
        }

        const beforeProcessedCount = this.settings.processedFiles.length;
        this.settings.processedFiles = this.settings.processedFiles.filter(processedPath => processedPath !== file.path);
        let changed = beforeProcessedCount !== this.settings.processedFiles.length;
        if (this.clearFailedFile(file.path)) changed = true;
        if (this.removeProtectedJob(file.path)) changed = true;
        if (changed) await this.saveSettings();

        this.enqueueFile(file, true, "manual-vault-reprocess");
        new Notice(`Queued ${file.name} for processing.`);
    }

    async processCompanionNoteAgain(notePath: string): Promise<void> {
        const note = this.app.vault.getAbstractFileByPath(notePath);
        if (!(note instanceof TFile) || note.extension.toLowerCase() !== "md" || !note.path.startsWith(this.settings.bfmNewFileLocation)) {
            new Notice("Select a companion note inside the BFM New File Location.");
            return;
        }
        const file = this.findSourceFileForCompanionNote(note.path);
        if (!(file instanceof TFile) || file.extension.toLowerCase() === "md" || !file.path.startsWith(this.settings.basePath)) {
            new Notice("Could not resolve the watched source file for that companion note.");
            return;
        }
        if (this.isPathProcessing(file.path) || this.isPathProcessing(note.path)) {
            new Notice(`${file.name} is already queued or processing.`);
            return;
        }

        await this.manualPairFilesImmediate(file.path, note.path, false);
        await this.processSingleFileAgain(file.path);
    }

    async createCompanionNoteForSourceFile(path: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile) || file.extension.toLowerCase() === "md" || !file.path.startsWith(this.settings.basePath)) {
            new Notice("Select an image/source file inside the watched Base Path.");
            return;
        }
        if (this.isPathProcessing(file.path)) {
            new Notice(`${file.name} is already queued or processing.`);
            return;
        }

        const existingNote = this.findCompanionNoteForSourceFile(file);
        if (existingNote instanceof TFile) {
            await this.manualPairFilesImmediate(file.path, existingNote.path, false);
            new Notice(`Companion note already exists: ${existingNote.name}`);
            return;
        }

        const expectedNotePath = this.getBfmNotePath(file);
        const createdNote = await this.createMissingBfmNoteWithRetry(file, expectedNotePath);
        if (createdNote instanceof TFile) {
            await this.manualPairFilesImmediate(file.path, createdNote.path, false);
            new Notice(`Created companion note for ${file.name}.`);
            return;
        }

        new Notice(`Could not create a companion note for ${file.name}.`);
    }

    async backfillExistingVaultCompanionNotes(
        files = this.getHashableBaseFiles(),
        onProgress?: (done: number, total: number, summary: ExistingVaultCompanionSummary) => void
    ): Promise<ExistingVaultCompanionSummary> {
        const summary: ExistingVaultCompanionSummary = {
            total: files.length,
            existing: 0,
            created: 0,
            skipped: 0,
            failed: 0,
        };

        for (let index = 0; index < files.length; index += 1) {
            const file = files[index];
            try {
                const currentFile = this.app.vault.getAbstractFileByPath(file.path);
                if (!(currentFile instanceof TFile) || this.isPathProcessing(file.path)) {
                    summary.skipped += 1;
                } else {
                    let note = this.findCompanionNoteForSourceFile(file);
                    if (note instanceof TFile) {
                        summary.existing += 1;
                    } else {
                        note = await this.createMissingBfmNote(file, this.getBfmNotePath(file), false);
                        if (note instanceof TFile) {
                            summary.created += 1;
                        } else {
                            summary.failed += 1;
                        }
                    }

                    if (note instanceof TFile) {
                        await this.manualPairFilesImmediate(file.path, note.path, false, false);
                    }
                }
            } catch (error) {
                summary.failed += 1;
                console.warn("Maru\'s Autotag existing vault companion note backfill failed", file.path, error);
            }

            onProgress?.(index + 1, files.length, summary);
            if ((index + 1) % 20 === 0) await this.sleep(1);
        }

        await this.saveSettings();
        return summary;
    }

    async createExistingVaultCompanionNotes(): Promise<void> {
        const files = this.getHashableBaseFiles();
        const total = files.length;
        const progress = this.showProgressNotice(
            "Creating companion notes",
            total > 0 ? `Checking 0/${total}` : "No source files found.",
            Math.max(1, total)
        );

        if (total === 0) {
            progress.setProgress(1, "No source files found.");
            window.setTimeout(() => progress.hide(), 1600);
            return;
        }

        const summary = await this.backfillExistingVaultCompanionNotes(files, (done, count) => {
            progress.setProgress(done, `Checking ${done}/${count}`);
        });

        const message = `Created ${summary.created}, found ${summary.existing}, skipped ${summary.skipped}, failed ${summary.failed}.`;
        progress.setProgress(total, message);
        window.setTimeout(() => progress.hide(), 2200);
        new Notice(`Existing vault companion notes checked. ${message}`);
    }

    async indexExistingVaultDuplicateProtection(): Promise<void> {
        const files = this.getHashableBaseFiles();
        const total = files.length;
        const totalSteps = Math.max(1, total * 2);
        const progress = this.showProgressNotice(
            "Indexing existing vault files",
            total > 0 ? `Checking companions 0/${total}` : "No source files found.",
            totalSteps
        );

        if (total === 0) {
            progress.setProgress(1, "No source files found.");
            window.setTimeout(() => progress.hide(), 1600);
            return;
        }

        const companionSummary = await this.backfillExistingVaultCompanionNotes(files, (done, count) => {
            progress.setProgress(done, `Checking companions ${done}/${count}`);
        });

        const records: DuplicateRecord[] = [];
        let hashFailed = 0;
        let skippedWithoutCompanion = 0;
        const shouldComputeVisualHash = this.settings.useDuplicateProtection && this.settings.duplicateDetectionMode === "exact-visual";

        for (let index = 0; index < files.length; index += 1) {
            const file = files[index];
            try {
                const currentFile = this.app.vault.getAbstractFileByPath(file.path);
                if (!(currentFile instanceof TFile)) {
                    hashFailed += 1;
                } else {
                    const note = this.findCompanionNoteForSourceFile(file);
                    if (!(note instanceof TFile)) {
                        skippedWithoutCompanion += 1;
                    } else {
                        const exactHash = await this.computeExactHash(file);
                        const visualHash = shouldComputeVisualHash
                            ? await this.computeVisualHash(file).catch(error => {
                                console.warn("Maru\'s Autotag existing vault visual hash failed", file.path, error);
                                return undefined;
                            })
                            : undefined;
                        records.push({
                            filePath: file.path,
                            notePath: note.path,
                            exactHash,
                            visualHash,
                            processedAt: Date.now(),
                        });
                    }
                }
            } catch (error) {
                hashFailed += 1;
                console.warn("Maru\'s Autotag existing vault duplicate indexing failed", file.path, error);
            }

            progress.setProgress(total + index + 1, `Hashing ${index + 1}/${total}`);
            if ((index + 1) % 20 === 0) await this.sleep(1);
        }

        this.settings.duplicateRecords = records;
        this.backfillPairRecordsFromDuplicateRecords();
        await this.saveSettings();

        const disabledNotice = this.isDuplicateProtectionActive()
            ? ""
            : " Duplicate Protection is currently disabled; the index is saved and will be used after enabling it.";
        const message = `Indexed ${records.length}/${total} file${total === 1 ? "" : "s"}. Created ${companionSummary.created} companion note${companionSummary.created === 1 ? "" : "s"}; skipped ${skippedWithoutCompanion} without companions; ${hashFailed} hash failure${hashFailed === 1 ? "" : "s"}.${disabledNotice}`;
        progress.setProgress(totalSteps, message);
        window.setTimeout(() => progress.hide(), 2600);
        new Notice(message);
    }

    applyBfmFormatCase(value: string, suffix: string | undefined): string {
        if (suffix === "UP") return value.toUpperCase();
        if (suffix === "LOW") return value.toLowerCase();
        return value;
    }

    renderBfmFileNameFormat(file: TFile): string {
        return this.renderBfmFileNameFormatFromParts(file.name, file.path, file.extension);
    }

    renderBfmFileNameFormatFromParts(fileName: string, filePath: string, extension: string): string {
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        const link = `[[${filePath}]]`;
        const embed = `![[${filePath}]]`;
        const format = this.settings.bfmFileNameFormat?.trim() || DEFAULT_SETTINGS.bfmFileNameFormat;

        const rendered = format.replace(/\{\{(NAME|FULLNAME|EXTENSION|PATH|LINK|EMBED)(?::(UP|LOW))?\}\}/gi, (_match, token: string, suffix: string | undefined) => {
            const normalizedToken = token.toUpperCase();
            const normalizedSuffix = suffix?.toUpperCase();
            const value = normalizedToken === "NAME"
                ? nameWithoutExt
                : normalizedToken === "FULLNAME"
                    ? fileName
                    : normalizedToken === "EXTENSION"
                        ? extension
                        : normalizedToken === "PATH"
                            ? filePath
                            : normalizedToken === "LINK"
                                ? link
                                : embed;

            return this.applyBfmFormatCase(value, normalizedSuffix);
        });

        return rendered.endsWith(".md") ? rendered : `${rendered}.md`;
    }

    getBfmNoteNamesForFile(file: TFile): string[] {
        return [this.renderBfmFileNameFormat(file)];
    }

    getBfmConflictNoteNamesForFile(file: TFile): string[] {
        const names = new Set<string>(this.getBfmNoteNamesForFile(file));
        const extension = file.extension || (file.name.includes(".") ? file.name.split(".").pop() ?? "" : "");
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const copyNumberMatch = nameWithoutExt.match(/^(.*)\s+\d+$/);
        if (copyNumberMatch) {
            const originalFileName = extension ? `${copyNumberMatch[1]}.${extension}` : copyNumberMatch[1];
            names.add(this.renderBfmFileNameFormatFromParts(originalFileName, file.path.replace(file.name, originalFileName), extension));
        }
        return Array.from(names);
    }

    getBfmNotePath(file: TFile): string {
        const bfmNoteName = this.renderBfmFileNameFormat(file);
        return `${this.settings.bfmNewFileLocation}/${bfmNoteName}`;
    }

    getBfmNoteCandidatePaths(file: TFile): string[] {
        return this.getBfmNoteNamesForFile(file).map(name => `${this.settings.bfmNewFileLocation}/${name}`);
    }

    isBfmConflictNoteName(noteName: string, formattedNoteName: string): boolean {
        return noteName.startsWith("CONFLICT-") && noteName.endsWith(`-${formattedNoteName}`);
    }

    getLinkedPathFromCompanionNote(note: TFile): string | null {
        const cache = this.app.metadataCache.getFileCache(note);
        const frontmatter = cache?.frontmatter as Record<string, unknown> | undefined;
        const linkProperty = this.getLinkToFilePropertyName();
        return typeof frontmatter?.[linkProperty] === "string"
            ? this.extractPathFromWikiLink(frontmatter[linkProperty] as string)
            : null;
    }

    isCompanionCandidateValidForFile(note: TFile, file: TFile, pairId?: string): boolean {
        const owner = this.getPairRecordForNotePath(note.path);
        if (owner && pairId && owner.pairId !== pairId) return false;
        if (owner && !pairId && owner.imagePath !== file.path) return false;
        const linkedPath = this.getLinkedPathFromCompanionNote(note);
        if (linkedPath && linkedPath !== file.path) return false;
        return true;
    }

    findBfmNoteVariant(file: TFile): TFile | null {
        const activePair = this.getActiveRunPairForPath(file.path);
        const pairRecord = activePair ? this.getPairRecordById(activePair.pairId) : this.getPairRecordForImagePath(file.path);
        const pairId = activePair?.pairId ?? pairRecord?.pairId;
        const existingPairNote = pairRecord?.notePath ? this.app.vault.getAbstractFileByPath(pairRecord.notePath) : null;
        if (existingPairNote instanceof TFile && this.isCompanionCandidateValidForFile(existingPairNote, file, pairId)) {
            return existingPairNote;
        }

        const candidateNames = new Set(this.getBfmConflictNoteNamesForFile(file));
        const notes = this.app.vault.getMarkdownFiles()
            .filter(note => note.path.startsWith(`${this.settings.bfmNewFileLocation}/`));
        const conflictNote = notes.find(note => {
            for (const candidateName of candidateNames) {
                if (this.isBfmConflictNoteName(note.name, candidateName) && this.isCompanionCandidateValidForFile(note, file, pairId)) return true;
            }
            return false;
        });
        if (conflictNote instanceof TFile) return conflictNote;

        const candidatePaths = new Set(this.getBfmNoteCandidatePaths(file));
        for (const candidatePath of candidatePaths) {
            const note = this.app.vault.getAbstractFileByPath(candidatePath);
            if (note instanceof TFile && this.isCompanionCandidateValidForFile(note, file, pairId)) return note;
        }

        return notes.find(note => {
            for (const candidateName of candidateNames) {
                if (note.name === candidateName && this.isCompanionCandidateValidForFile(note, file, pairId)) return true;
            }
            return false;
        }) ?? null;
    }
    doesBfmNotePathMatchFile(notePath: string, file: TFile): boolean {
        const noteName = notePath.split("/").pop() ?? notePath;
        const exactNames = this.getBfmNoteNamesForFile(file);
        if (exactNames.some(candidateName => notePath === `${this.settings.bfmNewFileLocation}/${candidateName}` || noteName === candidateName)) {
            return true;
        }
        return this.getBfmConflictNoteNamesForFile(file).some(candidateName => this.isBfmConflictNoteName(noteName, candidateName));
    }

    async waitForBfmNote(file: TFile, expectedNotePath: string): Promise<TFile | null> {
        const deadline = Date.now() + this.settings.bfmNoteMaxWaitMs;
        const pollInterval = Math.max(100, this.settings.bfmNotePollIntervalMs);

        while (Date.now() < deadline) {
            const note = this.findBfmNoteVariant(file);
            if (note instanceof TFile) {
                if (note.path !== expectedNotePath) {
                    console.log("Maru\'s Autotag resolved companion note variant:", { expectedNotePath, resolvedNotePath: note.path });
                }
                return note;
            }

            const remaining = deadline - Date.now();
            if (remaining <= 0) {
                break;
            }

            await this.sleep(Math.min(pollInterval, remaining));
        }

        return null;
    }
    showCompanionRetryNotice(): void {
        const fragment = document.createDocumentFragment();
        const wrapper = fragment.createDiv({ cls: "bfm-autotag-retry-notice" });
        wrapper.createDiv({ cls: "bfm-autotag-retry-spinner" });
        const text = wrapper.createDiv({ cls: "bfm-autotag-retry-text" });
        text.createDiv({ text: "Companion note not found", cls: "bfm-autotag-retry-title" });
        text.createDiv({ text: "Retrying...", cls: "bfm-autotag-retry-subtitle" });
        new Notice(fragment, this.settings.bfmNoteMaxWaitMs);
    }

    showProgressNotice(title: string, subtitle: string, total: number, showBar = true): ProgressNoticeController {
        const fragment = document.createDocumentFragment();
        const wrapper = fragment.createDiv({ cls: "bfm-autotag-progress-notice" });
        const header = wrapper.createDiv({ cls: "bfm-autotag-progress-header" });
        header.createDiv({ cls: "bfm-autotag-progress-spinner" });
        const text = header.createDiv({ cls: "bfm-autotag-progress-text" });
        text.createDiv({ text: title, cls: "bfm-autotag-progress-title" });
        const subtitleEl = text.createDiv({ cls: "bfm-autotag-progress-subtitle" });
        const fill = showBar
            ? wrapper.createDiv({ cls: "bfm-autotag-progress-bar" }).createDiv({ cls: "bfm-autotag-progress-fill" })
            : null;
        const notice = new Notice(fragment, 0) as Notice & { hide?: () => void };
        const safeTotal = Math.max(1, total);
        const setSubtitle = (value: string) => {
            subtitleEl.empty();
            if (!value.endsWith("...")) {
                subtitleEl.setText(value);
                return;
            }
            subtitleEl.createSpan({ text: value.slice(0, -3).trimEnd() });
            const dotsEl = subtitleEl.createSpan({ cls: "bfm-autotag-loading-dots" });
            [0, 1, 2].forEach(() => dotsEl.createSpan({ text: "." }));
        };
        setSubtitle(subtitle);

        return {
            setProgress: (done: number, nextSubtitle?: string) => {
                const clamped = Math.max(0, Math.min(done, safeTotal));
                const percent = Math.round((clamped / safeTotal) * 100);
                if (fill) fill.style.width = `${percent}%`;
                setSubtitle(nextSubtitle ?? `${clamped}/${safeTotal}`);
                wrapper.toggleClass("is-complete", clamped >= safeTotal);
            },
            hide: () => {
                if (typeof notice.hide === "function") notice.hide();
            },
        };
    }

    isProcessingActivityActive(): boolean {
        return this.isProcessingQueue || this.processingQueue.size > 0 || this.currentRunIds.size > 0;
    }

    getProcessingActivityCounts(): { completed: number; total: number; active: number; waiting: number; visible: number } {
        const visible = this.getUniqueProcessingPaths().length;
        const active = this.activeWorkerPaths.size;
        const waiting = Math.max(0, visible - active);
        const activeTotal = this.isProcessingActivityActive()
            ? Math.max(this.activeProcessingTotal, this.activeProcessingCompleted + visible)
            : Math.max(this.activeProcessingTotal, this.activeProcessingCompleted);
        const total = Math.max(0, activeTotal);
        const completed = total > 0 ? Math.min(this.activeProcessingCompleted, total) : 0;
        return { completed, total, active, waiting, visible };
    }

    getUniqueProcessingPaths(): string[] {
        const paths = new Set<string>();
        this.processingQueue.forEach((_item, path) => paths.add(path));
        this.currentRunIds.forEach((_runId, path) => paths.add(path));
        this.settings.protectedJobs.forEach(job => {
            if (!this.settings.processedFiles.includes(job.path)) paths.add(job.path);
        });
        return Array.from(paths);
    }

    getActiveProcessingImageFiles(): TFile[] {
        return Array.from(this.activeWorkerPaths)
            .map(path => this.app.vault.getAbstractFileByPath(path))
            .filter((file): file is TFile => file instanceof TFile && file.extension.toLowerCase() !== "md");
    }

    getQueuedProcessingImageCount(): number {
        const activePaths = new Set(this.activeWorkerPaths);
        return this.getUniqueProcessingPaths()
            .filter(path => !activePaths.has(path))
            .filter(path => {
                const file = this.app.vault.getAbstractFileByPath(path);
                return file instanceof TFile && file.extension.toLowerCase() !== "md";
            })
            .length;
    }

    getProcessingActivityPercent(): number {
        if (!this.isProcessingActivityActive()) return 100;
        const counts = this.getProcessingActivityCounts();
        if (counts.total > 0) {
            return Math.max(3, Math.min(95, Math.round((counts.completed / counts.total) * 100)));
        }
        const startedAt = this.activeProcessingStartedAt ?? Date.now();
        const elapsed = Date.now() - startedAt;
        return Math.max(3, Math.min(95, Math.round((elapsed / 60000) * 95)));
    }

    getProcessingActivitySubtitle(): string {
        const counts = this.getProcessingActivityCounts();
        if (!this.isProcessingActivityActive()) {
            return counts.total > 0
                ? `Processed ${counts.completed}/${counts.total} file${counts.total === 1 ? "" : "s"}.`
                : "No files in queue.";
        }
        return `Processing ${counts.completed}/${counts.total || counts.visible} Files ...`;
    }

    startActiveProcessingNotice(): void {
        if (!this.activeProcessingStartedAt) {
            this.activeProcessingStartedAt = Date.now();
        }
        if (!this.activeProcessingNotice) {
            this.activeProcessingNotice = this.showProgressNotice(
                "Processing",
                this.getProcessingActivitySubtitle(),
                100,
                false
            );
        }
        this.updateActiveProcessingNotice();
        if (this.activeProcessingNoticeTimer === null) {
            this.activeProcessingNoticeTimer = window.setInterval(() => this.updateActiveProcessingNotice(), 1000);
        }
    }

    updateActiveProcessingNotice(): void {
        if (!this.activeProcessingNotice) return;
        this.activeProcessingNotice.setProgress(
            this.getProcessingActivityPercent(),
            this.getProcessingActivitySubtitle()
        );
    }

    completeActiveProcessingNotice(): void {
        if (this.activeProcessingNoticeTimer !== null) {
            window.clearInterval(this.activeProcessingNoticeTimer);
            this.activeProcessingNoticeTimer = null;
        }
        const notice = this.activeProcessingNotice;
        const counts = this.getProcessingActivityCounts();
        this.activeProcessingNotice = null;
        this.activeProcessingStartedAt = null;
        if (!notice) return;
        notice.setProgress(100, `Processed ${counts.completed}/${counts.total || counts.completed} file${(counts.total || counts.completed) === 1 ? "" : "s"}. Processing queue complete.`);
        this.activeProcessingCompleted = 0;
        this.activeProcessingTotal = 0;
        window.setTimeout(() => notice.hide(), 1800);
    }

    clearActiveProcessingNotice(): void {
        if (this.activeProcessingNoticeTimer !== null) {
            window.clearInterval(this.activeProcessingNoticeTimer);
            this.activeProcessingNoticeTimer = null;
        }
        const notice = this.activeProcessingNotice;
        this.activeProcessingNotice = null;
        this.activeProcessingStartedAt = null;
        this.activeProcessingCompleted = 0;
        this.activeProcessingTotal = 0;
        notice?.hide();
    }

    async showReprocessingNoticePreview(): Promise<void> {
        const total = 5;
        const progress = this.showProgressNotice("Processing unprocessed files", "Preview: queueing 0/5", total);
        for (let index = 0; index < total; index += 1) {
            await this.sleep(450);
            progress.setProgress(index + 1, `Preview: queued ${index + 1}/${total}`);
        }
        await this.sleep(1400);
        progress.hide();
    }

    async waitForBfmNoteWithRetry(file: TFile, expectedNotePath: string): Promise<TFile | null> {
        const first = await this.waitForBfmNote(file, expectedNotePath);
        if (first instanceof TFile) return first;

        this.showCompanionRetryNotice();
        return this.waitForBfmNote(file, expectedNotePath);
    }

    buildFolderMetadata(filePath: string): {
        folderCandidateValues: string[];
        folderPropertyItems: Record<string, string[]>;
        wikiLink: string;
        embedLink: string;
        fileExt: string;
    } {
        const normalizedFilePath = filePath.replace(/\\/g, "/");
        const parentPath = normalizedFilePath.split("/").slice(0, -1).join("/");
        const normalizedBasePath = this.settings.basePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        const relativeFolderPath = normalizedBasePath
            && (parentPath === normalizedBasePath || parentPath.startsWith(`${normalizedBasePath}/`))
            ? parentPath.slice(normalizedBasePath.length).replace(/^\/+/, "")
            : parentPath;
        const relevantParts = relativeFolderPath.split("/").map(part => part.trim()).filter(Boolean);

        const folderPropertyItems: Record<string, string[]> = {};
        const folderCandidateValues: string[] = [];
        const fallbackProperty = this.normalizeFolderFallbackProperty(this.settings.folderFallbackProperty);
        const addFolderValue = (property: string, value: string, format: string | undefined, useAsAiCandidate: boolean) => {
            const normalizedProperty = this.normalizeFolderFallbackProperty(property);
            const item = this.formatYamlListItem(value, format);
            const items = folderPropertyItems[normalizedProperty] ?? [];
            if (!items.includes(item)) {
                items.push(item);
            }
            folderPropertyItems[normalizedProperty] = items;

            if (useAsAiCandidate && !folderCandidateValues.includes(value)) {
                folderCandidateValues.push(value);
            }
        };

        const extension = normalizedFilePath.split(".").pop();
        const fileExt = extension || "unknown";
        const wikiLink = `[[${normalizedFilePath}]]`;
        const embedLink = `![[${normalizedFilePath}]]`;

        if (!this.settings.useFolderTags) {
            return {
                folderCandidateValues: [],
                folderPropertyItems,
                wikiLink,
                embedLink,
                fileExt,
            };
        }

        relevantParts.forEach(part => {
            let matchedPropertyList = false;
            this.getFolderPropertyMappings().forEach(mapping => {
                if (mapping.property && mapping.values.includes(part)) {
                    addFolderValue(mapping.property, part, mapping.format, mapping.useAsAiCandidate);
                    matchedPropertyList = true;
                }
            });

            if (!matchedPropertyList) {
                addFolderValue(fallbackProperty, part, this.settings.folderFallbackFormat, this.settings.folderFallbackUseAsAiCandidate);
            }
        });

        return {
            folderCandidateValues,
            folderPropertyItems,
            wikiLink,
            embedLink,
            fileExt,
        };
    }

    normalizeFolderFallbackProperty(property: string | undefined): string {
        const normalized = (property ?? "").trim();
        return normalized.length > 0 ? normalized : DEFAULT_SETTINGS.folderFallbackProperty;
    }

    normalizePropertyName(property: string | undefined, fallback: string): string {
        const normalized = (property ?? "")
            .trim()
            .replace(/\s+/g, "-");
        return normalized.length > 0 ? normalized : fallback;
    }

    getLinkToFilePropertyName(): string {
        return this.normalizePropertyName(this.settings.linkToFilePropertyName, DEFAULT_SETTINGS.linkToFilePropertyName);
    }

    getFileTypePropertyName(): string {
        return this.normalizePropertyName(this.settings.fileTypePropertyName, DEFAULT_SETTINGS.fileTypePropertyName);
    }

    getEmbedPropertyName(): string {
        return this.normalizePropertyName(this.settings.embedPropertyName, DEFAULT_SETTINGS.embedPropertyName);
    }

    getAiTagsPropertyName(): string {
        return this.normalizePropertyName(this.settings.aiTagsPropertyName, DEFAULT_SETTINGS.aiTagsPropertyName);
    }

    getAiDescriptionPropertyName(): string {
        return this.normalizePropertyName(this.settings.aiDescriptionPropertyName, DEFAULT_SETTINGS.aiDescriptionPropertyName);
    }

    getVaultAwarenessOutputPropertyName(): string {
        return this.normalizePropertyName(this.settings.vaultAwarenessOutputPropertyName, DEFAULT_SETTINGS.vaultAwarenessOutputPropertyName);
    }

    normalizeFolderPropertyMappings(mappings: unknown): FolderPropertyMapping[] {
        if (!Array.isArray(mappings)) return [];

        return mappings
            .map((mapping, index) => {
                const raw = mapping as Partial<FolderPropertyMapping>;
                const property = this.normalizeFolderFallbackProperty(raw.property);
                const values = Array.isArray(raw.values)
                    ? raw.values.map(value => String(value).trim()).filter(Boolean)
                    : [];
                const uniqueValues = Array.from(new Set(values));

                return {
                    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `${Date.now()}-${index}`,
                    property,
                    values: uniqueValues,
                    format: typeof raw.format === "string" ? raw.format : "",
                    useAsAiCandidate: raw.useAsAiCandidate !== false,
                    useAsVaultCandidate: raw.useAsVaultCandidate !== false,
                };
            })
            .filter(mapping => mapping.property.length > 0);
    }

    getFolderPropertyMappings(): FolderPropertyMapping[] {
        return this.normalizeFolderPropertyMappings(this.settings.folderPropertyMappings);
    }

    parseFrontmatterTemplateProperties(template: string): string[] {
        return this.parseFrontmatterTemplate(template).order;
    }

    parseFrontmatterTemplate(template: string): { order: string[]; values: Record<string, string[]> } {
        const order: string[] = [];
        const values: Record<string, string[]> = {};
        let currentProperty: string | null = null;
        let currentBlock: { property: string; lines: string[] } | null = null;

        const addProperty = (property: string) => {
            if (!order.includes(property)) order.push(property);
            values[property] = values[property] ?? [];
        };
        const flushBlock = () => {
            if (!currentBlock) return;
            const existing = values[currentBlock.property] ?? [];
            const blockValue = currentBlock.lines.length > 0
                ? `|\n${currentBlock.lines.join("\n")}`
                : "|";
            values[currentBlock.property] = [...existing, blockValue];
            currentBlock = null;
        };

        template
            .replace(/\r\n/g, "\n")
            .split("\n")
            .forEach(rawLine => {
                const trimmed = rawLine.trim();
                if (!trimmed || trimmed === "---") return;

                const propertyMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*:(.*)$/);
                if (propertyMatch) {
                    flushBlock();
                    const property = propertyMatch[1].trim();
                    const remainder = propertyMatch[2].trim();
                    currentProperty = property;
                    addProperty(property);

                    if (remainder === "|") {
                        currentBlock = { property, lines: [] };
                    } else if (remainder.length > 0) {
                        values[property].push(remainder);
                    }
                    return;
                }

                if (currentBlock) {
                    currentBlock.lines.push(rawLine.startsWith("  ") ? rawLine : `  ${trimmed}`);
                    return;
                }

                if (currentProperty && trimmed.startsWith("-")) {
                    values[currentProperty].push(trimmed);
                }
            });

        flushBlock();
        return { order, values };
    }

    getFrontmatterTemplate(): { order: string[]; values: Record<string, string[]> } {
        return this.parseFrontmatterTemplate(this.settings.frontmatterTemplate);
    }

    getTemplateFromExistingNote(content: string): { template: { order: string[]; values: Record<string, string[]> }; body: string } {
        const normalized = content.replace(/\r\n/g, "\n");
        const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
        if (!match) {
            return {
                template: { order: [], values: {} },
                body: normalized,
            };
        }

        return {
            template: this.parseFrontmatterTemplate(match[1]),
            body: match[2] ?? "",
        };
    }

    getFrontmatterTemplateProperties(): string[] {
        return this.getFrontmatterTemplate().order;
    }

    getEnabledGeneratedFrontmatterProperties(): string[] {
        const generated: string[] = [];
        if (this.settings.linkToFilePropertyEnabled) {
            generated.push(this.getLinkToFilePropertyName());
        }
        if (this.settings.fileTypePropertyEnabled) {
            generated.push(this.getFileTypePropertyName());
        }
        if (this.settings.embedPropertyEnabled) {
            generated.push(this.getEmbedPropertyName());
        }
        if (this.settings.aiTagsPropertyEnabled) {
            generated.push(this.getAiTagsPropertyName());
        }
        if (this.settings.aiDescriptionPropertyEnabled) {
            generated.push(this.getAiDescriptionPropertyName());
        }
        if (this.settings.vaultAwarenessOutputEnabled) {
            generated.push(this.getVaultAwarenessOutputPropertyName());
        }

        return Array.from(new Set(generated));
    }

    getRequiredFrontmatterProperties(): string[] {
        return this.getEnabledGeneratedFrontmatterProperties();
    }

    getListManagedGeneratedPropertyNames(): Set<string> {
        const properties = new Set<string>();

        if (this.settings.useFolderTags) {
            this.getFolderPropertyMappings().forEach(mapping => {
                properties.add(this.normalizeFolderFallbackProperty(mapping.property));
            });
            properties.add(this.normalizeFolderFallbackProperty(this.settings.folderFallbackProperty));
        }

        if (this.settings.geolocationEnabled) {
            this.getGeolocationProperties().forEach(mapping => {
                if (!this.isScalarGeolocationMapping(mapping)) {
                    properties.add(this.normalizePropertyName(mapping.property, this.getDefaultGeolocationPropertyName(mapping.field)));
                }
            });
        }

        if (this.settings.aiTagsPropertyEnabled) {
            properties.add(this.getAiTagsPropertyName());
        }

        if (this.settings.vaultAwarenessOutputEnabled) {
            properties.add(this.getVaultAwarenessOutputPropertyName());
        }

        return properties;
    }

    isScalarGeolocationMapping(mapping: GeolocationPropertyMapping): boolean {
        return !mapping.format.trim()
            && (mapping.field === "latitude" || mapping.field === "longitude" || mapping.field === "altitude");
    }

    getGeneratedPropertyNames(): Set<string> {
        return new Set([
            DEFAULT_SETTINGS.linkToFilePropertyName,
            DEFAULT_SETTINGS.fileTypePropertyName,
            DEFAULT_SETTINGS.embedPropertyName,
            "aitags",
            DEFAULT_SETTINGS.aiTagsPropertyName,
            DEFAULT_SETTINGS.aiDescriptionPropertyName,
            this.getLinkToFilePropertyName(),
            this.getFileTypePropertyName(),
            this.getEmbedPropertyName(),
            this.getAiTagsPropertyName(),
            this.getAiDescriptionPropertyName(),
            DEFAULT_SETTINGS.vaultAwarenessOutputPropertyName,
            this.getVaultAwarenessOutputPropertyName(),
            ...this.getGeolocationPropertyNames(),
        ]);
    }

    getGeolocationPropertyNames(): string[] {
        return this.getGeolocationProperties().map(mapping => this.normalizePropertyName(mapping.property, this.getDefaultGeolocationPropertyName(mapping.field)));
    }

    getDefaultGeolocationPropertyName(field: GeolocationField): string {
        return GEOLOCATION_FIELD_OPTIONS.find(option => option.field === field)?.defaultProperty ?? field;
    }

    getGeolocationProperties(): GeolocationPropertyMapping[] {
        const seen = new Set<string>();
        const raw = Array.isArray(this.settings.geolocationProperties) ? this.settings.geolocationProperties : [];
        return raw
            .map((mapping, index) => {
                const field = GEOLOCATION_FIELD_OPTIONS.some(option => option.field === mapping?.field)
                    ? mapping.field
                    : "latitude";
                return {
                    id: typeof mapping?.id === "string" && mapping.id ? mapping.id : `${Date.now()}-${index}`,
                    field,
                    property: this.normalizePropertyName(mapping?.property, this.getDefaultGeolocationPropertyName(field)),
                    format: typeof mapping?.format === "string" ? mapping.format : "",
                };
            })
            .filter(mapping => {
                const key = `${mapping.field}
${mapping.property}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }

    addGeolocationValue(items: Record<string, string[]>, property: string, value: string | number | undefined, format: string | undefined): void {
        if (value === undefined || value === null || value === "") return;
        const normalizedProperty = this.normalizePropertyName(property, "location");
        const rawValue = String(value);
        const trimmedFormat = (format ?? "").trim();
        const rendered = trimmedFormat
            ? JSON.stringify(this.formatValueWithTemplate(rawValue, trimmedFormat))
            : typeof value === "number" ? rawValue : JSON.stringify(rawValue);
        const values = items[normalizedProperty] ?? [];
        if (!values.includes(rendered)) values.push(rendered);
        items[normalizedProperty] = values;
    }

    getGeocodeCacheKey(latitude: number, longitude: number): string {
        return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    }

    getTodayKey(): string {
        return new Date().toISOString().slice(0, 10);
    }

    normalizeNominatimData(json: unknown, latitude: number, longitude: number): Record<string, string> {
        const data = json as { display_name?: unknown; address?: Record<string, unknown> };
        const address = data?.address ?? {};
        const city = address.city ?? address.town ?? address.village ?? address.hamlet;
        const region = address.state ?? address.region;
        const fullAddress = [address.house_number, address.road, address.suburb, city, address.county, region, address.country]
            .map(value => typeof value === "string" ? value.trim() : "")
            .filter(Boolean)
            .join(", ");
        return {
            latitude: String(latitude),
            longitude: String(longitude),
            country: typeof address.country === "string" ? address.country : "",
            region: typeof region === "string" ? region : "",
            county: typeof address.county === "string" ? address.county : "",
            city: typeof city === "string" ? city : "",
            suburb: typeof address.suburb === "string" ? address.suburb : "",
            road: typeof address.road === "string" ? address.road : "",
            postcode: typeof address.postcode === "string" ? address.postcode : "",
            houseNumber: typeof address.house_number === "string" ? address.house_number : "",
            address: fullAddress,
            displayName: typeof data.display_name === "string" ? data.display_name : "",
        };
    }

    async waitForPublicGeocodeSlot(): Promise<boolean> {
        const today = this.getTodayKey();
        if (this.settings.geocodePublicDay !== today) {
            this.settings.geocodePublicDay = today;
            this.settings.geocodePublicRequestsToday = 0;
        }
        if (this.settings.geocodePublicRequestsToday >= PUBLIC_NOMINATIM_DAILY_CAP) {
            return false;
        }
        const elapsed = Date.now() - (this.settings.geocodeLastRequestAt || 0);
        if (elapsed < PUBLIC_NOMINATIM_DELAY_MS) {
            await this.sleep(PUBLIC_NOMINATIM_DELAY_MS - elapsed);
        }
        this.settings.geocodeLastRequestAt = Date.now();
        this.settings.geocodePublicRequestsToday += 1;
        await this.saveSettings();
        return true;
    }

    getGeocodeBackoffMs(attempts: number): number {
        return Math.min(MAX_GEOCODE_BACKOFF_MS, 2 * 60 * 1000 * Math.pow(2, Math.max(0, attempts - 1)));
    }

    queueGeocodeJob(imagePath: string, notePath: string, coordinates: GpsCoordinates, reason: string, attempts = 0): void {
        const existing = this.settings.pendingGeocodeJobs.find(job => job.imagePath === imagePath && job.notePath === notePath);
        const nextAttempts = attempts + 1;
        const nextTryAt = Date.now() + this.getGeocodeBackoffMs(nextAttempts);
        const job: PendingGeocodeJob = {
            imagePath,
            notePath,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            attempts: nextAttempts,
            queuedAt: existing?.queuedAt ?? Date.now(),
            nextTryAt,
            lastError: reason,
        };
        this.settings.pendingGeocodeJobs = [
            ...this.settings.pendingGeocodeJobs.filter(candidate => !(candidate.imagePath === imagePath && candidate.notePath === notePath)),
            job,
        ];
        const minutes = Math.max(1, Math.round((nextTryAt - Date.now()) / 60000));
        new Notice(`Geolocation lookup queued; retry timer increased to about ${minutes} minute${minutes === 1 ? "" : "s"}.`);
        if (nextAttempts >= 3) {
            new Notice("Geolocation lookup failed several times. Use local Nominatim if you need immediate bulk lookups.");
        }
    }

    async reverseGeocode(coordinates: GpsCoordinates): Promise<Record<string, string> | null> {
        if (this.settings.geolocationProvider === "disabled") return null;
        const cacheKey = this.getGeocodeCacheKey(coordinates.latitude, coordinates.longitude);
        const cached = this.settings.geocodeCache?.[cacheKey];
        if (cached) return cached.data;

        if (this.settings.geolocationProvider === "public-nominatim") {
            const allowed = await this.waitForPublicGeocodeSlot();
            if (!allowed) throw new Error("Public Nominatim daily safety cap reached");
        }

        const baseUrl = this.settings.geolocationProvider === "local-nominatim"
            ? (this.settings.geolocationLocalUrl?.trim() || DEFAULT_SETTINGS.geolocationLocalUrl)
            : "https://nominatim.openstreetmap.org";
        const url = `${baseUrl.replace(/\/+$/, "")}/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(String(coordinates.latitude))}&lon=${encodeURIComponent(String(coordinates.longitude))}`;
        const response = await requestUrl({
            url,
            method: "GET",
            headers: {
                "Accept": "application/json",
                "User-Agent": "marus-autotag Obsidian Plugin (personal geolocation lookup)",
            },
            throw: false,
        });
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Reverse geocoding failed with status ${response.status}`);
        }
        const data = this.normalizeNominatimData(response.json, coordinates.latitude, coordinates.longitude);
        this.settings.geocodeCache = {
            ...(this.settings.geocodeCache ?? {}),
            [cacheKey]: {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                data,
                updatedAt: Date.now(),
            },
        };
        await this.saveSettings();
        return data;
    }

    readAscii(view: DataView, offset: number, length: number): string {
        let result = "";
        for (let index = 0; index < length; index++) {
            const code = view.getUint8(offset + index);
            if (code === 0) break;
            result += String.fromCharCode(code);
        }
        return result;
    }

    readRational(view: DataView, offset: number, littleEndian: boolean): number {
        const numerator = view.getUint32(offset, littleEndian);
        const denominator = view.getUint32(offset + 4, littleEndian);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    readExifValueOffset(view: DataView, entryOffset: number, tiffStart: number, littleEndian: boolean): number {
        return tiffStart + view.getUint32(entryOffset + 8, littleEndian);
    }

    readGpsCoordinate(view: DataView, offset: number, littleEndian: boolean): number {
        const degrees = this.readRational(view, offset, littleEndian);
        const minutes = this.readRational(view, offset + 8, littleEndian);
        const seconds = this.readRational(view, offset + 16, littleEndian);
        return degrees + (minutes / 60) + (seconds / 3600);
    }

    parseGpsFromExifSegment(buffer: ArrayBuffer, segmentOffset: number, segmentLength: number): GpsCoordinates | null {
        const view = new DataView(buffer, segmentOffset, segmentLength);
        if (this.readAscii(view, 0, 6) !== "Exif") return null;
        const tiffStart = 6;
        const endian = this.readAscii(view, tiffStart, 2);
        const littleEndian = endian === "II";
        if (!littleEndian && endian !== "MM") return null;
        const firstIfdOffset = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
        const entries = view.getUint16(firstIfdOffset, littleEndian);
        let gpsIfdOffset = 0;
        for (let index = 0; index < entries; index++) {
            const entryOffset = firstIfdOffset + 2 + (index * 12);
            const tag = view.getUint16(entryOffset, littleEndian);
            if (tag === 0x8825) {
                gpsIfdOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
                break;
            }
        }
        if (!gpsIfdOffset) return null;

        const gpsEntries = view.getUint16(gpsIfdOffset, littleEndian);
        let latRef = "";
        let lonRef = "";
        let lat: number | null = null;
        let lon: number | null = null;
        let altitude: number | undefined;
        let altitudeRef = 0;
        for (let index = 0; index < gpsEntries; index++) {
            const entryOffset = gpsIfdOffset + 2 + (index * 12);
            const tag = view.getUint16(entryOffset, littleEndian);
            const count = view.getUint32(entryOffset + 4, littleEndian);
            if (tag === 1) latRef = this.readAscii(view, entryOffset + 8, Math.min(count, 4));
            if (tag === 3) lonRef = this.readAscii(view, entryOffset + 8, Math.min(count, 4));
            if (tag === 5) altitudeRef = view.getUint8(entryOffset + 8);
            if (tag === 2) lat = this.readGpsCoordinate(view, this.readExifValueOffset(view, entryOffset, tiffStart, littleEndian), littleEndian);
            if (tag === 4) lon = this.readGpsCoordinate(view, this.readExifValueOffset(view, entryOffset, tiffStart, littleEndian), littleEndian);
            if (tag === 6) altitude = this.readRational(view, this.readExifValueOffset(view, entryOffset, tiffStart, littleEndian), littleEndian);
        }
        if (lat === null || lon === null) return null;
        if (latRef.toUpperCase() === "S") lat = -lat;
        if (lonRef.toUpperCase() === "W") lon = -lon;
        if (altitude !== undefined && altitudeRef === 1) altitude = -altitude;
        return { latitude: Number(lat.toFixed(6)), longitude: Number(lon.toFixed(6)), altitude: altitude === undefined ? undefined : Number(altitude.toFixed(2)) };
    }

    async readGpsCoordinates(file: TFile): Promise<GpsCoordinates | null> {
        const extension = file.extension.toLowerCase();
        if (extension !== "jpg" && extension !== "jpeg") return null;
        const buffer = await this.app.vault.readBinary(file);
        const view = new DataView(buffer);
        if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
        let offset = 2;
        while (offset + 4 < view.byteLength) {
            if (view.getUint8(offset) !== 0xff) break;
            const marker = view.getUint8(offset + 1);
            const size = view.getUint16(offset + 2);
            if (marker === 0xe1) {
                return this.parseGpsFromExifSegment(buffer, offset + 4, size - 2);
            }
            offset += 2 + size;
        }
        return null;
    }

    shouldCreateMissingCompanionNote(_path: string): boolean {
        return this.settings.createMissingCompanionNote;
    }

    shouldDeleteLonelyFileWithoutCompanion(_path: string): boolean {
        return this.settings.deleteLonelyFileWithoutCompanion;
    }

    async deleteLonelyFileWithoutCompanion(file: TFile, runId?: string): Promise<void> {
        const filePath = file.path;
        await this.deleteFileWithoutLinkedCascade(file, runId);
        this.settings.lonelyDeletedImageCount += 1;
        this.clearFailedFile(filePath);
        this.removeDuplicateRecordsForPath(filePath);
        this.cleanupProcessingStateForPath(filePath, runId);
        this.markDuplicateProcessingComplete(filePath, runId);
        this.removeProtectedJob(filePath);
        if (this.isCurrentRun(filePath, runId ?? "")) this.currentRunIds.delete(filePath);
        await this.saveSettings();
        new Notice("Maru\'s Autotag deleted lonely image without companion note: " + file.name);
    }

    async ensureVaultFolder(folderPath: string): Promise<void> {
        const normalized = folderPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        if (!normalized) return;
        const parts = normalized.split("/").filter(Boolean);
        let current = "";
        for (const part of parts) {
            current = current ? current + "/" + part : part;
            const existing = this.app.vault.getAbstractFileByPath(current);
            if (existing instanceof TFolder) continue;
            if (existing) throw new Error("Cannot create folder because a file exists at " + current);
            await this.app.vault.createFolder(current);
        }
    }

    async createMissingBfmNote(file: TFile, expectedNotePath: string, showNotice = true): Promise<TFile | null> {
        const existing = this.findBfmNoteVariant(file);
        if (existing instanceof TFile) return existing;

        const folderPath = expectedNotePath.split("/").slice(0, -1).join("/");
        await this.ensureVaultFolder(folderPath);

        const currentExisting = this.app.vault.getAbstractFileByPath(expectedNotePath);
        if (currentExisting instanceof TFile) return currentExisting;
        if (currentExisting) throw new Error("Cannot create companion note because a folder exists at " + expectedNotePath);

        const templateText = this.settings.templateSource === "internal"
            ? (this.settings.frontmatterTemplate ?? "").trim().replace(/^---\s*\n?/, "").replace(/\n?---$/, "").trim()
            : "";
        const initialContent = templateText ? "---\n" + templateText + "\n---\n" : "---\n---\n";
        const created = await this.app.vault.create(expectedNotePath, initialContent);
        if (showNotice) new Notice("Maru\'s Autotag created missing companion note: " + created.name);
        return created;
    }
    async createMissingBfmNoteWithRetry(file: TFile, expectedNotePath: string): Promise<TFile | null> {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                const created = await this.createMissingBfmNote(file, expectedNotePath);
                if (created instanceof TFile) return created;
            } catch (error) {
                console.warn("Maru\'s Autotag missing companion note creation failed", file.path, error);
            }

            if (attempt === 0) {
                this.showCompanionRetryNotice();
                const note = await this.waitForBfmNote(file, expectedNotePath);
                if (note instanceof TFile) return note;
            }
        }

        return this.waitForBfmNote(file, expectedNotePath);
    }

    async getImageGeolocationContext(file: TFile, notePath: string): Promise<ImageGeolocationContext | null> {
        if (!this.settings.geolocationEnabled) return null;
        const coordinates = await this.readGpsCoordinates(file).catch(error => {
            console.warn("Maru\'s Autotag GPS metadata read failed", file.path, error);
            return null;
        });
        if (!coordinates) return null;

        let locationData: Record<string, string> = {
            latitude: String(coordinates.latitude),
            longitude: String(coordinates.longitude),
            altitude: coordinates.altitude === undefined ? "" : String(coordinates.altitude),
        };
        if (this.settings.geolocationProvider !== "disabled") {
            try {
                locationData = { ...locationData, ...(await this.reverseGeocode(coordinates) ?? {}) };
            } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                this.queueGeocodeJob(file.path, notePath, coordinates, reason);
            }
        }

        return { coordinates, locationData };
    }

    buildGeolocationPropertyItemsFromContext(context: ImageGeolocationContext | null): Record<string, string[]> {
        const items: Record<string, string[]> = {};
        if (!this.settings.geolocationEnabled || !context) return items;

        this.getGeolocationProperties().forEach(mapping => {
            const value = mapping.field === "latitude"
                ? context.coordinates.latitude
                : mapping.field === "longitude"
                    ? context.coordinates.longitude
                    : mapping.field === "altitude"
                        ? context.coordinates.altitude
                        : context.locationData[mapping.field];
            this.addGeolocationValue(items, mapping.property, value, mapping.format);
        });
        return items;
    }

    async buildGeolocationPropertyItems(file: TFile, notePath: string): Promise<Record<string, string[]>> {
        return this.buildGeolocationPropertyItemsFromContext(await this.getImageGeolocationContext(file, notePath));
    }

    formatGeolocationContextForDescription(context: ImageGeolocationContext | null): string {
        if (!context) return "";
        const data = context.locationData;
        const street = [data.houseNumber, data.road].filter(Boolean).join(" ").trim();
        const locality = [
            street,
            data.suburb,
            data.city,
            data.county,
            data.region,
            data.country,
            data.postcode,
        ]
            .map(value => typeof value === "string" ? value.trim() : "")
            .filter(Boolean)
            .join(", ");
        const displayLocation = data.address || locality || data.displayName || "";
        const coordinateParts = [
            `${context.coordinates.latitude}, ${context.coordinates.longitude}`,
            context.coordinates.altitude === undefined ? "" : `altitude ${context.coordinates.altitude}`,
        ].filter(Boolean);
        return [
            displayLocation ? `Known location metadata: ${displayLocation}` : "",
            `GPS coordinates: ${coordinateParts.join(", ")}`,
        ].filter(Boolean).join(". ");
    }

    appendGeolocationContextToDescription(aiDescription: string, contextText: string): string {
        const trimmedDescription = aiDescription.trim();
        if (!contextText.trim() || trimmedDescription.toLowerCase().includes("known location metadata:")) {
            return trimmedDescription;
        }
        return `${trimmedDescription}\n\n${contextText}.`;
    }

    buildOllamaDescriptionGeolocationMessages(aiDescription: string, contextText: string): { role: string; content: string }[] {
        return [
            {
                role: "system",
                content: [
                    "You revise image descriptions for Obsidian image notes.",
                    "Return only the revised description text.",
                    "Preserve concrete visual observations from the original description.",
                    "Use the known geolocation metadata as metadata, not as something visually observed.",
                    "Correct or remove guessed city, country, landmark, or regional claims that conflict with the known geolocation metadata.",
                    "Do not invent new landmarks, countries, cities, people, dates, or historical facts.",
                    "Do not include markdown headings, YAML, bullet points, explanations, or notes about the task.",
                ].join(" "),
            },
            {
                role: "user",
                content: [
                    "Known geolocation metadata:",
                    contextText,
                    "",
                    "Original image description:",
                    aiDescription.trim(),
                    "",
                    "Revise the description so location claims are based on the known metadata instead of assumptions. Return only the revised description.",
                ].join("\n"),
            },
        ];
    }

    buildOllamaDescriptionRequestVariants(
        model: string,
        messages: { role: string; content: string }[]
    ): Record<string, unknown>[] {
        const base = {
            model,
            stream: false,
            options: {
                temperature: 0.1,
                num_predict: 1024,
            },
            messages,
        };

        const variants: Record<string, unknown>[] = [
            { ...base, ...( /qwen3/i.test(model) ? { think: false } : {} ) },
            { ...base },
        ];

        const seen = new Set<string>();
        return variants.filter(variant => {
            const key = JSON.stringify(variant);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    normalizeOllamaDescriptionText(text: string): string {
        let normalized = this.stripThinkBlocks(text)
            .replace(/^```(?:text|markdown)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        if (normalized.startsWith("{") && normalized.endsWith("}")) {
            try {
                const parsed = JSON.parse(normalized) as { description?: unknown; aidescription?: unknown };
                const description = typeof parsed.description === "string"
                    ? parsed.description
                    : typeof parsed.aidescription === "string" ? parsed.aidescription : "";
                if (description.trim()) normalized = description.trim();
            } catch (_error) {
                // Keep the plain text response if it only looks like JSON.
            }
        }

        if ((normalized.startsWith('"') && normalized.endsWith('"')) || (normalized.startsWith("'") && normalized.endsWith("'"))) {
            normalized = normalized.slice(1, -1).trim();
        }

        return normalized;
    }

    async enhanceAiDescriptionWithGeolocation(aiDescription: string | null, context: ImageGeolocationContext | null): Promise<string | null> {
        if (!aiDescription?.trim() || !this.settings.useGeolocationForAiDescription) return aiDescription;
        const contextText = this.formatGeolocationContextForDescription(context);
        if (!contextText) return aiDescription;

        const model = this.settings.ollamaModel.trim();
        if (!model) {
            return this.appendGeolocationContextToDescription(aiDescription, contextText);
        }

        const requestVariants = this.buildOllamaDescriptionRequestVariants(
            model,
            this.buildOllamaDescriptionGeolocationMessages(aiDescription, contextText)
        );

        for (let attempt = 0; attempt < requestVariants.length; attempt += 1) {
            try {
                const response = await requestUrl({
                    url: this.getOllamaChatUrl(),
                    method: "POST",
                    throw: false,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestVariants[attempt]),
                });
                if (response.status < 200 || response.status >= 300) {
                    console.warn("Maru\'s Autotag geolocation description enhancement attempt failed", {
                        attempt: attempt + 1,
                        model,
                        status: response.status,
                        body: response.text?.slice(0, 300) || "no response body",
                    });
                    continue;
                }

                const revised = this.normalizeOllamaDescriptionText(this.extractOllamaMessageText(response.json));
                if (revised) {
                    console.log(`Maru\'s Autotag geolocation-enhanced AI description (attempt ${attempt + 1}):`, revised);
                    return revised;
                }
            } catch (error) {
                console.warn("Maru\'s Autotag geolocation description enhancement attempt threw", {
                    attempt: attempt + 1,
                    model,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return this.appendGeolocationContextToDescription(aiDescription, contextText);
    }

    async retryQueuedGeolocations(force = false): Promise<void> {
        if (!this.settings.geolocationEnabled || this.settings.geolocationProvider === "disabled") {
            if (force) new Notice("Reverse geocoding is disabled.");
            return;
        }
        const now = Date.now();
        const queuedJobs = [...this.settings.pendingGeocodeJobs];
        this.settings.pendingGeocodeJobs = [];
        const remaining: PendingGeocodeJob[] = [];
        let updated = 0;
        for (const job of queuedJobs) {
            const image = this.app.vault.getAbstractFileByPath(job.imagePath);
            const note = this.app.vault.getAbstractFileByPath(job.notePath);
            if (!(image instanceof TFile) || !(note instanceof TFile)) continue;
            if (!force && job.nextTryAt > now) {
                remaining.push(job);
                continue;
            }
            const coordinates = { latitude: job.latitude, longitude: job.longitude };
            try {
                const data = await this.reverseGeocode(coordinates);
                if (!data) {
                    remaining.push(job);
                    continue;
                }
                const geoItems: Record<string, string[]> = {};
                this.getGeolocationProperties().forEach(mapping => {
                    const value = mapping.field === "latitude" ? job.latitude : mapping.field === "longitude" ? job.longitude : data[mapping.field];
                    this.addGeolocationValue(geoItems, mapping.property, value, mapping.format);
                });
                const content = await this.app.vault.read(note);
                const updatedContent = this.mergeFrontmatterPropertyItems(content, geoItems);
                if (updatedContent !== content) await this.app.vault.modify(note, updatedContent);
                updated += 1;
            } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                this.queueGeocodeJob(job.imagePath, job.notePath, coordinates, reason, job.attempts);
            }
        }
        const queuedKeys = new Set(this.settings.pendingGeocodeJobs.map(job => `${job.imagePath}\n${job.notePath}`));
        this.settings.pendingGeocodeJobs = [
            ...remaining.filter(job => !queuedKeys.has(`${job.imagePath}\n${job.notePath}`)),
            ...this.settings.pendingGeocodeJobs,
        ];
        await this.saveSettings();
        new Notice(`Updated ${updated} queued geolocation${updated === 1 ? "" : "s"}. ${this.settings.pendingGeocodeJobs.length} still queued.`);
    }

    async copyQueuedGeolocationsToClipboard(): Promise<void> {
        const jobs = this.settings.pendingGeocodeJobs;
        const text = jobs.length > 0
            ? jobs.map(job => `Image: ${job.imagePath}\nCompanion: ${job.notePath}\nCoordinates: ${job.latitude}, ${job.longitude}\nAttempts: ${job.attempts}\nNext try: ${new Date(job.nextTryAt).toLocaleString()}\nLast error: ${job.lastError ?? "unknown"}`).join("\n\n")
            : "No queued geolocation lookups.";
        await navigator.clipboard.writeText(text);
        new Notice(jobs.length > 0 ? `Copied ${jobs.length} queued geolocation lookup${jobs.length === 1 ? "" : "s"}.` : "No queued geolocations to copy.");
    }

    async clearQueuedGeolocations(): Promise<void> {
        const count = this.settings.pendingGeocodeJobs.length;
        this.settings.pendingGeocodeJobs = [];
        await this.saveSettings();
        new Notice(`Cleared ${count} queued geolocation lookup${count === 1 ? "" : "s"}.`);
    }

    isTemplateOverwritePlaceholderValue(value: string): boolean {
        return value.toLowerCase().includes("this text will be overwritten");
    }

    getYamlValueDedupeKey(value: string): string {
        return value.trim().replace(/^-\s*/, "").trim();
    }

    toYamlListItem(value: string): string {
        const trimmed = value.trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("-")) return trimmed;
        if (trimmed.includes("\n")) return `- ${trimmed.replace(/\n/g, "\n  ")}`;
        return `- ${trimmed}`;
    }

    normalizeYamlListPropertyValues(values: string[]): string[] {
        const seen = new Set<string>();
        const output: string[] = [];
        values.forEach(value => {
            const item = this.toYamlListItem(value);
            if (!item) return;
            const key = this.getYamlValueDedupeKey(item);
            if (seen.has(key)) return;
            seen.add(key);
            output.push(item);
        });
        return output;
    }

    mergeYamlPropertyValues(existingValues: string[], incomingValues: string[], forceList: boolean): string[] {
        const baseValues = existingValues.filter(value => !this.isTemplateOverwritePlaceholderValue(value));
        const seen = new Set<string>();
        const output: string[] = [];
        [...baseValues, ...incomingValues]
            .map(value => value.trim())
            .filter(Boolean)
            .forEach(value => {
                const key = forceList ? this.getYamlValueDedupeKey(value) : value;
                if (seen.has(key)) return;
                seen.add(key);
                output.push(value);
            });
        return forceList ? this.normalizeYamlListPropertyValues(output) : output;
    }

    mergeFrontmatterPropertyItems(content: string, propertyItems: Record<string, string[]>): string {
        const parsed = this.getTemplateFromExistingNote(content);
        const listManagedProperties = this.getListManagedGeneratedPropertyNames();
        Object.keys(propertyItems).forEach(property => {
            const forceList = listManagedProperties.has(property);
            parsed.template.values[property] = forceList
                ? this.mergeYamlPropertyValues(parsed.template.values[property] ?? [], propertyItems[property], true)
                : propertyItems[property];
            if (!parsed.template.order.includes(property)) parsed.template.order.push(property);
        });
        const frontmatterLines = parsed.template.order
            .map(property => this.buildYamlProperty(property, parsed.template.values[property] ?? [], listManagedProperties.has(property)))
            .join("\n");
        const body = parsed.body ? `\n\n${parsed.body.trimEnd()}\n` : "\n";
        return `---\n${frontmatterLines}\n---${body}`;
    }

    buildYamlProperty(property: string, values: string[], forceList = false): string {
        if (values.length === 0) {
            return `${property}: `;
        }

        if (forceList) {
            const listValues = this.normalizeYamlListPropertyValues(values);
            return listValues.length > 0 ? `${property}:\n${listValues.join("\n")}` : `${property}: `;
        }

        if (values.length === 1 && (values[0].startsWith("|") || (!values[0].startsWith("-") && !values[0].includes("\n")))) {
            return `${property}: ${values[0]}`;
        }

        return `${property}:\n${values.join("\n")}`;
    }

    buildYamlContent(
        folderPropertyItems: Record<string, string[]>,
        geolocationPropertyItems: Record<string, string[]>,
        aiTags: string[],
        vaultAwarenessTags: string[],
        aiDescription: string | null,
        wikiLink: string,
        fileExt: string,
        embedLink: string,
        existingNoteContent: string | null = null
    ): string {
        const fallbackProperty = this.normalizeFolderFallbackProperty(this.settings.folderFallbackProperty);
        const baseTemplate = this.settings.templateSource === "bfm-templater"
            ? this.getTemplateFromExistingNote(existingNoteContent ?? "")
            : { template: this.getFrontmatterTemplate(), body: "" };
        const template = baseTemplate.template;
        const propertyValues: Record<string, string[]> = {};
        Object.keys(template.values).forEach(property => {
            propertyValues[property] = [...template.values[property]];
        });
        const listManagedProperties = this.getListManagedGeneratedPropertyNames();

        const appendValues = (property: string, values: string[]) => {
            const forceList = listManagedProperties.has(property);
            const current = forceList
                ? (propertyValues[property] ?? []).filter(value => !this.isTemplateOverwritePlaceholderValue(value))
                : propertyValues[property] ?? [];
            const seen = new Set(current.map(value => forceList ? this.getYamlValueDedupeKey(value) : value));
            values
                .map(value => value.trim())
                .filter(Boolean)
                .forEach(value => {
                    const key = forceList ? this.getYamlValueDedupeKey(value) : value;
                    if (seen.has(key)) return;
                    seen.add(key);
                    current.push(value);
                });
            propertyValues[property] = current;
        };

        const setGeneratedValues = (property: string, values: string[]) => {
            if (listManagedProperties.has(property)) {
                appendValues(property, values);
                return;
            }
            propertyValues[property] = values;
        };

        Object.keys(folderPropertyItems).forEach(property => {
            appendValues(property, folderPropertyItems[property]);
        });
        Object.keys(geolocationPropertyItems).forEach(property => {
            appendValues(property, geolocationPropertyItems[property]);
        });

        const linkToFileProperty = this.getLinkToFilePropertyName();
        const fileTypeProperty = this.getFileTypePropertyName();
        const embedProperty = this.getEmbedPropertyName();
        const aiTagsProperty = this.getAiTagsPropertyName();
        const aiDescriptionProperty = this.getAiDescriptionPropertyName();

        if (this.settings.linkToFilePropertyEnabled) {
            propertyValues[linkToFileProperty] = [`"${wikiLink}"`];
        }
        if (this.settings.fileTypePropertyEnabled) {
            propertyValues[fileTypeProperty] = [`"${fileExt}"`];
        }
        if (this.settings.embedPropertyEnabled) {
            propertyValues[embedProperty] = [`"${embedLink}"`];
        }
        if (this.settings.aiTagsPropertyEnabled) {
            setGeneratedValues(aiTagsProperty, this.formatYamlList(aiTags, this.settings.aiTagsFormat).split("\n").filter(Boolean));
        }
        if (this.settings.vaultAwarenessOutputEnabled && vaultAwarenessTags.length > 0) {
            appendValues(
                this.getVaultAwarenessOutputPropertyName(),
                this.formatYamlList(vaultAwarenessTags, this.settings.vaultAwarenessOutputFormat).split("\n").filter(Boolean)
            );
        }
        if (this.settings.aiDescriptionPropertyEnabled) {
            propertyValues[aiDescriptionProperty] = [`|\n${this.formatYamlBlock(aiDescription, "No description generated.")}`];
        }

        const templateProperties = template.order;
        const requiredProperties = this.settings.templateSource === "bfm-templater"
            ? this.getEnabledGeneratedFrontmatterProperties()
            : this.getRequiredFrontmatterProperties();
        const order: string[] = [];
        const addProperty = (property: string) => {
            if (!order.includes(property)) order.push(property);
        };

        const fallbackHasTemplateSlot = templateProperties.includes(fallbackProperty);
        if (!fallbackHasTemplateSlot && propertyValues[fallbackProperty]?.length > 0) {
            addProperty(fallbackProperty);
        }

        templateProperties.forEach(addProperty);
        requiredProperties.forEach(addProperty);

        Object.keys(propertyValues)
            .filter(property => propertyValues[property].length > 0 && !order.includes(property) && property !== fallbackProperty)
            .sort((a, b) => a.localeCompare(b))
            .forEach(addProperty);

        const generatedPropertyNames = this.getGeneratedPropertyNames();
        const frontmatterLines = order
            .filter(property => propertyValues[property]?.length > 0 || !generatedPropertyNames.has(property))
            .map(property => this.buildYamlProperty(property, propertyValues[property] ?? [], listManagedProperties.has(property)))
            .join("\n");

        let bodyContent = baseTemplate.body.replace(/\r\n/g, "\n").trimEnd();
        if (this.settings.writeImageEmbedInBody && !bodyContent.includes(embedLink)) {
            bodyContent = bodyContent ? `${bodyContent}\n\n${embedLink}` : embedLink;
        }
        const bodySection = bodyContent ? `\n\n${bodyContent}\n` : "\n";

        return `---
${frontmatterLines}
---${bodySection}`;
    }

    buildPreviewImagePath(): string {
        const basePath = (this.settings.basePath || DEFAULT_SETTINGS.basePath)
            .replace(/\\/g, "/")
            .replace(/^\/+|\/+$/g, "");
        const parts: string[] = [];
        const usedParts = new Set<string>();
        const addPart = (value: string) => {
            const part = value.replace(/[\\/]+/g, " ").trim();
            const key = part.toLowerCase();
            if (!part || usedParts.has(key)) return;
            usedParts.add(key);
            parts.push(part);
        };

        if (this.settings.useFolderTags) {
            this.getFolderPropertyMappings().forEach(mapping => {
                const sampleValue = mapping.values.find(value => value.trim().length > 0);
                if (sampleValue) addPart(sampleValue);
            });
            addPart("Example Folder");
        }

        return [basePath, ...parts, "Example Image.jpg"]
            .filter(Boolean)
            .join("/")
            .replace(/\/+/g, "/");
    }

    buildPreviewGeolocationPropertyItems(): Record<string, string[]> {
        const items: Record<string, string[]> = {};
        if (!this.settings.geolocationEnabled) return items;

        const exampleValues: Record<GeolocationField, string | number> = {
            latitude: 52.52,
            longitude: 13.405,
            altitude: 34,
            country: "Example Country",
            region: "Example Region",
            county: "Example County",
            city: "Example City",
            suburb: "Example Suburb",
            road: "Example Street",
            postcode: "12345",
            houseNumber: "1",
            address: "1 Example Street, Example City, Example Country",
            displayName: "1 Example Street, Example City, Example Country",
        };

        this.getGeolocationProperties().forEach(mapping => {
            this.addGeolocationValue(items, mapping.property, exampleValues[mapping.field], mapping.format);
        });

        return items;
    }

    buildPreviewBfmTemplaterContent(): string {
        const lines = [
            "bfm-template-property:",
            "- Preserved from BFM Templater",
        ];

        if (this.settings.linkToFilePropertyEnabled) lines.push(`${this.getLinkToFilePropertyName()}: This text will be overwritten`);
        if (this.settings.fileTypePropertyEnabled) lines.push(`${this.getFileTypePropertyName()}: This text will be overwritten`);
        if (this.settings.embedPropertyEnabled) lines.push(`${this.getEmbedPropertyName()}: This text will be overwritten`);
        if (this.settings.aiTagsPropertyEnabled) lines.push(`${this.getAiTagsPropertyName()}:\n- This text will be overwritten`);
        if (this.settings.vaultAwarenessOutputEnabled) lines.push(`${this.getVaultAwarenessOutputPropertyName()}:\n- This text will be preserved until Vault Awareness adds matching terms`);
        if (this.settings.aiDescriptionPropertyEnabled) lines.push(`${this.getAiDescriptionPropertyName()}: This text will be overwritten`);

        return `---\n${lines.join("\n")}\n---\nExisting BFM Templater body text.`;
    }

    getPreviewPluginFilledProperties(): Set<string> {
        const filledProperties = new Set(this.getEnabledGeneratedFrontmatterProperties());

        if (this.settings.useFolderTags) {
            this.getFolderPropertyMappings().forEach(mapping => {
                filledProperties.add(this.normalizeFolderFallbackProperty(mapping.property));
            });
            filledProperties.add(this.normalizeFolderFallbackProperty(this.settings.folderFallbackProperty));
        }

        if (this.settings.geolocationEnabled) {
            this.getGeolocationProperties().forEach(mapping => {
                filledProperties.add(this.normalizePropertyName(mapping.property, this.getDefaultGeolocationPropertyName(mapping.field)));
            });
        }

        return filledProperties;
    }

    getFrontmatterPreviewTemplateText(): string {
        if (this.settings.templateSource === "bfm-templater") {
            const extracted = this.getTemplateFromExistingNote(this.buildPreviewBfmTemplaterContent()).template;
            return extracted.order
                .map(property => this.buildYamlProperty(property, extracted.values[property] ?? []))
                .join("\n");
        }

        return this.settings.frontmatterTemplate ?? "";
    }

    getUnparsedFrontmatterTemplateLines(templateText: string): string[] {
        const unparsedLines: string[] = [];
        let currentProperty: string | null = null;
        let currentBlockProperty: string | null = null;

        templateText
            .replace(/\r\n/g, "\n")
            .split("\n")
            .forEach(rawLine => {
                const trimmed = rawLine.trim();
                if (!trimmed || trimmed === "---") return;

                if (/^[A-Za-z0-9_-]+\s*::/.test(trimmed)) {
                    currentProperty = null;
                    currentBlockProperty = null;
                    unparsedLines.push(trimmed);
                    return;
                }

                const propertyMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*:(.*)$/);
                if (propertyMatch) {
                    const remainder = propertyMatch[2].trim();
                    currentProperty = propertyMatch[1].trim();
                    currentBlockProperty = remainder === "|" ? currentProperty : null;
                    return;
                }

                if (currentBlockProperty) return;
                if (currentProperty && trimmed.startsWith("-")) return;

                unparsedLines.push(trimmed);
            });

        return unparsedLines;
    }

    getFrontmatterPreviewTemplateCheck(): string[] {
        const templateText = this.getFrontmatterPreviewTemplateText();
        const template = this.parseFrontmatterTemplate(templateText);
        const filledProperties = this.getPreviewPluginFilledProperties();
        const unrecognized = new Set<string>();

        template.order
            .forEach(property => {
                if (filledProperties.has(property)) return false;
                const values = template.values[property] ?? [];
                if (values.length === 0 || values.some(value => value.toLowerCase().includes("this text will be overwritten"))) {
                    unrecognized.add(`${property}:`);
                }
            });

        this.getUnparsedFrontmatterTemplateLines(templateText).forEach(line => unrecognized.add(line));

        return Array.from(unrecognized);
    }

    getAvailableTemplatePropertyNames(): string[] {
        const properties = new Set<string>();
        this.getEnabledGeneratedFrontmatterProperties().forEach(property => properties.add(property));

        if (this.settings.useFolderTags) {
            this.getFolderPropertyMappings().forEach(mapping => {
                properties.add(this.normalizeFolderFallbackProperty(mapping.property));
            });
            properties.add(this.normalizeFolderFallbackProperty(this.settings.folderFallbackProperty));
        }

        if (this.settings.geolocationEnabled) {
            this.getGeolocationProperties().forEach(mapping => {
                properties.add(this.normalizePropertyName(mapping.property, this.getDefaultGeolocationPropertyName(mapping.field)));
            });
        }

        return Array.from(properties)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
    }

    getMissingTemplateDeclarationProperties(): string[] {
        const templateText = this.getFrontmatterPreviewTemplateText();
        const declaredProperties = new Set(this.parseFrontmatterTemplate(templateText).order);
        return this.getAvailableTemplatePropertyNames()
            .filter(property => !declaredProperties.has(property));
    }

    buildGeneratedMarkdownPreview(): string {
        const previewFilePath = this.buildPreviewImagePath();
        const {
            folderPropertyItems,
            wikiLink,
            embedLink,
            fileExt,
        } = this.buildFolderMetadata(previewFilePath);
        const geolocationPropertyItems = this.buildPreviewGeolocationPropertyItems();
        const previewVaultAwarenessTags = this.settings.vaultAwarenessEnabled
            ? [
                "Known Vault Concept",
                ...(this.settings.bridgeEnabled && this.settings.bridgeUsePreBridgeVaultAwarenessOutput ? ["Pre-Bridge Concept"] : []),
            ]
            : [];
        const includeVaultAwarenessInAiTags = this.settings.vaultAwarenessEnabled
            && (!this.settings.vaultAwarenessOutputEnabled || !this.settings.vaultAwarenessOutputExclusive);
        const aiTags = this.settings.aiTaggingEnabled && this.settings.aiTagsPropertyEnabled
            ? [
                "Example Tag",
                "Second Example",
                ...(includeVaultAwarenessInAiTags ? previewVaultAwarenessTags : []),
            ]
            : [];
        const aiDescription = this.settings.aiDescriptionPropertyEnabled
            ? "This text will be overwritten by the AI image description."
            : null;
        const existingNoteContent = this.settings.templateSource === "bfm-templater"
            ? this.buildPreviewBfmTemplaterContent()
            : null;

        return this.buildYamlContent(
            folderPropertyItems,
            geolocationPropertyItems,
            aiTags,
            previewVaultAwarenessTags,
            aiDescription,
            wikiLink,
            fileExt,
            embedLink,
            existingNoteContent
        );
    }

    async runWithConcurrency<T>(
        items: T[],
        limit: number,
        worker: (item: T) => Promise<void>
    ): Promise<void> {
        if (items.length === 0) {
            return;
        }

        const concurrency = Math.max(1, limit);
        const executing = new Set<Promise<void>>();

        for (const item of items) {
            const task = worker(item).finally(() => executing.delete(task));
            executing.add(task);

            if (executing.size >= concurrency) {
                await Promise.race(executing);
            }
        }

        await Promise.all(executing);
    }

    enqueueFile(file: TFile, forceRetry = false, source: ProtectedJobSource = "shutdown"): void {
        const filePath = file.path;

        if (this.isDeletionSuppressed(filePath)) return;
        if (!filePath.startsWith(this.settings.basePath)) return;
        if (this.settings.processedFiles.includes(filePath)) return;
        if (!forceRetry && this.hasReachedMaxAttempts(filePath)) return;

        this.showLimitedFileTypeWarning(file);

        if (this.queueBatchStartedAt === null) {
            this.queueBatchStartedAt = Date.now();
        }

        const runId = this.createRunId(filePath);
        const expectedNotePath = this.getBfmNotePath(file);
        const pairRecord = this.ensurePairRecordForImage(filePath);
        this.currentRunIds.set(filePath, runId);
        this.registerActiveRunPair(runId, pairRecord.pairId, filePath, expectedNotePath);
        this.processingQueue.set(filePath, { file, runId });
        if (this.settings.shutdownProtectionEnabled) {
            this.upsertProtectedJob(filePath, { stage: "queued", notePath: expectedNotePath, source, runId });
        }
        void this.saveSettings();
        this.startDuplicateFingerprintPrecompute(file, runId);
        if (this.queueFlushTimer !== null) {
            window.clearTimeout(this.queueFlushTimer);
        }

        const elapsed = Date.now() - this.queueBatchStartedAt;
        const remainingBatchWindow = this.settings.queueBatchMaxWaitMs - elapsed;
        const delay = remainingBatchWindow <= 0
            ? 0
            : Math.min(QUEUE_BATCH_DELAY_MS, remainingBatchWindow);

        this.queueFlushTimer = window.setTimeout(() => {
            this.queueFlushTimer = null;
            this.queueBatchStartedAt = null;
            void this.processQueue();
        }, delay);
    }
    async processQueue(): Promise<void> {
        if (this.isProcessingQueue) return;
        if (this.processingQueue.size === 0) return;

        this.isProcessingQueue = true;
        this.activeProcessingCompleted = 0;
        this.activeProcessingTotal = Math.max(this.activeProcessingTotal, this.getUniqueProcessingPaths().length);
        this.startActiveProcessingNotice();

        try {
            while (this.processingQueue.size > 0) {
                this.updateActiveProcessingNotice();
                const batch = Array.from(this.processingQueue.values())
                    .sort((a, b) => a.file.path.localeCompare(b.file.path));
                this.activeProcessingTotal = Math.max(this.activeProcessingTotal, this.activeProcessingCompleted + batch.length);

                this.processingQueue.clear();

                await this.runWithConcurrency(
                    batch,
                    this.settings.parallelWorkers,
                    item => {
                        this.activeWorkerPaths.add(item.file.path);
                        this.updateActiveProcessingNotice();
                        return this.processQueuedFile(item.file, item.runId)
                        .finally(() => {
                            this.activeWorkerPaths.delete(item.file.path);
                            this.activeProcessingCompleted += 1;
                            this.updateActiveProcessingNotice();
                        });
                    }
                );
                this.updateActiveProcessingNotice();
            }
        } finally {
            this.isProcessingQueue = false;
            await this.drainPendingManualPairActions();
            this.completeActiveProcessingNotice();
        }
    }
    async processQueuedFile(file: TFile, runId: string = this.currentRunIds.get(file.path) ?? this.createRunId(file.path)): Promise<void> {
        const filePath = file.path;

        if (!this.isCurrentRun(filePath, runId)) return;
        if (this.isDeletionSuppressed(filePath, runId)) {
            this.cleanupProcessingStateForPath(filePath, runId);
            await this.saveSettings();
            return;
        }
        if (this.settings.processedFiles.includes(filePath)) {
            this.cleanupActiveRunPairsForPath(filePath, runId);
            this.markDuplicateProcessingComplete(filePath, runId);
            this.currentRunIds.delete(filePath);
            return;
        }
        if (!filePath.startsWith(this.settings.basePath)) {
            this.cleanupActiveRunPairsForPath(filePath, runId);
            this.markDuplicateProcessingComplete(filePath, runId);
            this.currentRunIds.delete(filePath);
            return;
        }
        if (this.hasReachedMaxAttempts(filePath)) {
            this.cleanupActiveRunPairsForPath(filePath, runId);
            this.markDuplicateProcessingComplete(filePath, runId);
            this.currentRunIds.delete(filePath);
            new Notice(`Maru\'s Autotag skipped after max failures: ${file.name}`);
            return;
        }

        try {
            let notePath = this.activeRunPairs.get(runId)?.expectedNotePath ?? this.getBfmNotePath(file);
            await this.saveProtectedJob(filePath, { stage: "waiting-bfm-note", notePath, runId });
            let bfmNote = await this.waitForBfmNoteWithRetry(file, notePath);
            if (!this.isCurrentRun(filePath, runId)) return;
            if (bfmNote) {
                notePath = bfmNote.path;
                this.updateActiveRunPair(runId, { resolvedNotePath: bfmNote.path });
                this.updatePairRecord(this.activeRunPairs.get(runId)?.pairId, { notePath: bfmNote.path });
                this.updatePendingDuplicateAction(runId, { newNotePath: bfmNote.path });
            }
            if (!bfmNote && this.shouldCreateMissingCompanionNote(filePath)) {
                bfmNote = await this.createMissingBfmNoteWithRetry(file, notePath);
                if (bfmNote instanceof TFile) {
                    notePath = bfmNote.path;
                    this.updateActiveRunPair(runId, { resolvedNotePath: bfmNote.path });
                    this.updatePairRecord(this.activeRunPairs.get(runId)?.pairId, { notePath: bfmNote.path });
                    this.updatePendingDuplicateAction(runId, { newNotePath: bfmNote.path });
                }
            }
            if (!bfmNote && this.shouldDeleteLonelyFileWithoutCompanion(filePath) && !this.isDeletionSuppressed(filePath, runId)) {
                await this.deleteLonelyFileWithoutCompanion(file, runId);
                return;
            }
            if (!bfmNote) {
                this.cleanupActiveRunPairsForPath(filePath, runId);
                this.currentRunIds.delete(filePath);
                this.markDuplicateProcessingComplete(filePath, runId);
                this.removeProtectedJob(filePath);
                if (!this.isDeletionSuppressed(filePath, runId) && !this.isDeletionSuppressed(notePath)) {
                    await this.recordProcessingFailure(file, `BFM note not found after retry: ${notePath}`, false);
                }
                return;
            }
            if (this.isDeletionSuppressed(filePath, runId) || this.isDeletionSuppressed(bfmNote.path)) {
                this.cleanupProcessingStateForPath(filePath, runId);
                this.cleanupProcessingStateForPath(bfmNote.path);
                await this.saveSettings();
                return;
            }

            const {
                folderCandidateValues,
                folderPropertyItems,
                wikiLink,
                embedLink,
                fileExt,
            } = this.buildFolderMetadata(filePath);

            const duplicateHandling = await this.getPreparedDuplicateHandling(file, runId);
            if (!this.isCurrentRun(filePath, runId)) return;
            if (duplicateHandling.match && duplicateHandling.action === "delete-new-pair") {
                await this.deleteNewDuplicatePair(file, bfmNote, runId);
                return;
            }
            await this.saveProtectedJob(filePath, { stage: "processing", notePath, runId });

            const geolocationContext = await this.getImageGeolocationContext(file, notePath);
            const geolocationPropertyItems = this.buildGeolocationPropertyItemsFromContext(geolocationContext);
            const mergedFolderPropertyItems = folderPropertyItems;

            let aiDescription: string | null = null;
            let aiTags: string[] = [];
            let vaultAwarenessTags: string[] = [];

            {
                aiDescription = await this.analyzeImageFile(file);
                const shouldGenerateTagMetadata = this.settings.aiTaggingEnabled
                    && (this.settings.aiTagsPropertyEnabled || (this.settings.vaultAwarenessEnabled && this.settings.vaultAwarenessOutputEnabled));
                const shouldUseAiDescription = this.settings.aiDescriptionPropertyEnabled
                    || shouldGenerateTagMetadata;
                if (shouldUseAiDescription) {
                    aiDescription = await this.enhanceAiDescriptionWithGeolocation(aiDescription, geolocationContext);
                }
                if (!this.isCurrentRun(filePath, runId)) {
                    this.cleanupActiveRunPairsForPath(filePath, runId);
                    this.markDuplicateProcessingComplete(filePath, runId);
                    return;
                }

                if (aiDescription) {
                    console.log("Maru\'s Autotag AI description:", aiDescription);
                } else {
                    const needsAiDescription = this.settings.aiDescriptionPropertyEnabled || shouldGenerateTagMetadata;
                    const fallbackTaggingAvailable = shouldGenerateTagMetadata
                        && ((this.settings.filenameCandidateMode === "all" && this.getFilenameKeywordCandidates(file).length > 0)
                            || (this.settings.folderTagsCandidateMode === "all" && this.getFolderTagCandidates(folderCandidateValues).length > 0));

                    if (needsAiDescription && !fallbackTaggingAvailable) {
                        this.removeDuplicateRecordsForPath(filePath);
                        this.duplicateFingerprintCache.delete(this.getRunCacheKey(filePath, runId));
                        this.duplicateHandlingCache.delete(this.getRunCacheKey(filePath, runId));
                        this.markDuplicateProcessingComplete(filePath, runId);
                        this.cleanupActiveRunPairsForPath(filePath, runId);
                        this.currentRunIds.delete(filePath);
                        this.removeProtectedJob(filePath);
                        await this.recordProcessingFailure(file, "AI Image Analyzer returned no description");
                        return;
                    }

                    if (fallbackTaggingAvailable) {
                        console.warn("Maru\'s Autotag: AI Image Analyzer returned no description; using filename or folder keywords for AI tagging.", file.basename);
                    }
                }

                const shouldGenerateAiTags = shouldGenerateTagMetadata;
                const generatedTags = shouldGenerateAiTags
                    ? await this.generateAiTags(aiDescription, folderCandidateValues, file)
                    : { aiTags: [], vaultAwarenessTags: [] };
                aiTags = generatedTags.aiTags;
                vaultAwarenessTags = generatedTags.vaultAwarenessTags;
                if (!this.isCurrentRun(filePath, runId)) {
                    this.cleanupActiveRunPairsForPath(filePath, runId);
                    this.markDuplicateProcessingComplete(filePath, runId);
                    return;
                }
                if (shouldGenerateAiTags && aiTags.length === 0 && (!this.settings.vaultAwarenessOutputEnabled || vaultAwarenessTags.length === 0)) {
                    this.removeDuplicateRecordsForPath(filePath);
                    this.duplicateFingerprintCache.delete(this.getRunCacheKey(filePath, runId));
                    this.duplicateHandlingCache.delete(this.getRunCacheKey(filePath, runId));
                    this.markDuplicateProcessingComplete(filePath, runId);
                    this.cleanupActiveRunPairsForPath(filePath, runId);
                    this.currentRunIds.delete(filePath);
                    this.removeProtectedJob(filePath);
                    await this.recordProcessingFailure(file, "Ollama did not return aitags");
                    return;
                }

                if (shouldGenerateAiTags) {
                    console.log("Maru\'s Autotag aitags:", aiTags);
                    if (vaultAwarenessTags.length > 0) {
                        console.log("Maru\'s Autotag vault awareness tags:", vaultAwarenessTags);
                    }
                }
            }

            const currentSourceFile = this.app.vault.getAbstractFileByPath(filePath);
            const currentBfmNote = this.app.vault.getAbstractFileByPath(bfmNote.path);
            if (!(currentSourceFile instanceof TFile) || !(currentBfmNote instanceof TFile) || this.isDeletionSuppressed(filePath, runId) || this.isDeletionSuppressed(bfmNote.path)) {
                this.cleanupProcessingStateForPath(filePath, runId);
                this.cleanupProcessingStateForPath(bfmNote.path);
                await this.saveSettings();
                return;
            }

            const existingNoteContent = this.settings.templateSource === "bfm-templater"
                ? await this.app.vault.read(currentBfmNote)
                : null;
            const yamlContent = this.buildYamlContent(
                mergedFolderPropertyItems,
                geolocationPropertyItems,
                aiTags,
                vaultAwarenessTags,
                aiDescription,
                wikiLink,
                fileExt,
                embedLink,
                existingNoteContent
            );

            if (this.isDeletionSuppressed(filePath, runId) || this.isDeletionSuppressed(bfmNote.path)) {
                this.cleanupProcessingStateForPath(filePath, runId);
                this.cleanupProcessingStateForPath(bfmNote.path);
                await this.saveSettings();
                return;
            }
            if (!this.isCurrentRun(filePath, runId)) return;
            await this.saveProtectedJob(filePath, { stage: "writing", notePath, runId });
            await this.app.vault.modify(currentBfmNote, yamlContent);

            const finalDuplicateHandling = await this.finalizeDuplicateAction(file, currentBfmNote, duplicateHandling, runId);
            if (finalDuplicateHandling.action === "delete-new-pair") return;
            const activePairAfterReplace = this.activeRunPairs.get(runId);
            const pairRecordAfterReplace = this.getPairRecordById(activePairAfterReplace?.pairId);
            const finalProcessedPath = finalDuplicateHandling.action === "replace-original-keep-original" && finalDuplicateHandling.match
                ? finalDuplicateHandling.match.record.filePath
                : pairRecordAfterReplace?.imagePath ?? filePath;
            const finalNotePath = pairRecordAfterReplace?.notePath ?? currentBfmNote.path;
            this.clearFailedFile(filePath);
            this.updatePairRecord(activePairAfterReplace?.pairId, { imagePath: finalProcessedPath, notePath: finalNotePath });
            if (this.isDuplicateProtectionActive() && finalDuplicateHandling.exactHash) {
                this.upsertDuplicateRecord({
                    filePath: finalProcessedPath,
                    notePath: finalNotePath,
                    exactHash: finalDuplicateHandling.exactHash,
                    visualHash: finalDuplicateHandling.visualHash,
                    processedAt: Date.now(),
                });
            }
            this.markDuplicateProcessingComplete(filePath, runId);
            this.cleanupActiveRunPairsForPath(filePath, runId);
            if (this.isCurrentRun(filePath, runId)) this.currentRunIds.delete(filePath);
            this.removeProtectedJob(filePath);
            if (!this.settings.processedFiles.includes(finalProcessedPath)) {
                this.settings.processedFiles.push(finalProcessedPath);
            }
            await this.saveSettings();
        } catch (e) {
            if (!this.isCurrentRun(filePath, runId)) {
                this.duplicateFingerprintCache.delete(this.getRunCacheKey(filePath, runId));
                this.duplicateHandlingCache.delete(this.getRunCacheKey(filePath, runId));
                this.markDuplicateProcessingComplete(filePath, runId);
                this.cleanupActiveRunPairsForPath(filePath, runId);
                return;
            }
            this.removeDuplicateRecordsForPath(filePath);
            this.duplicateFingerprintCache.delete(this.getRunCacheKey(filePath, runId));
            this.duplicateHandlingCache.delete(this.getRunCacheKey(filePath, runId));
            this.markDuplicateProcessingComplete(filePath, runId);
            this.cleanupActiveRunPairsForPath(filePath, runId);
            this.currentRunIds.delete(filePath);
            this.removeProtectedJob(filePath);
            const reason = e instanceof Error ? e.message : String(e);
            await this.recordProcessingFailure(file, reason);
        }
    }
    // =========================
    // ONLOAD BELOW
    // =========================

    async onload() {
        await this.loadSettings();
        this.buildVaultVocabularyCache();
        this.app.workspace.onLayoutReady(() => this.buildVaultVocabularyCache());
        this.settingTab = new BfmAutotagSettingTab(this.app, this);
        this.addSettingTab(this.settingTab);

        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if (file instanceof TFile) {
                    this.addBfmAutotagFileContextMenu(menu, file);
                }
            })
        );

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, info) => {
                const embeddedFile = this.resolveEditorEmbedFile(editor, info);
                if (embeddedFile instanceof TFile) {
                    this.addBfmAutotagFileContextMenu(menu, embeddedFile);
                }
            })
        );

        this.app.workspace.onLayoutReady(() => {
            if (this.settings.autoProcessUnprocessedOnReload) {
                void this.processUnprocessedBaseFiles(true);
            }
        });

        this.registerEvent(
            this.app.metadataCache.on('resolved', () => {
                this.buildVaultVocabularyCache();
            })
        );

        this.registerEvent(
            this.app.metadataCache.on('changed', (file) => {
                if (file instanceof TFile) {
                    this.indexVocabularyFile(file);
                }
            })
        );
        this.registerEvent(
            this.app.vault.on('create', async (file) => {
                if (!(file instanceof TFile)) return;
                if (this.isDeletionSuppressed(file.path)) {
                    if (file.extension.toLowerCase() === "md") {
                        this.deletionCascadePaths.add(file.path);
                        try {
                            await this.app.vault.delete(file);
                        } finally {
                            window.setTimeout(() => this.deletionCascadePaths.delete(file.path), 1000);
                            window.setTimeout(() => this.clearDeletionSuppression(file.path), 5000);
                        }
                        return;
                    }

                    this.clearDeletionSuppression(file.path);
                    this.clearDeletionSuppression(this.getBfmNotePath(file));
                }
                this.enqueueFile(file);
            })
        );

        this.registerEvent(
            this.app.vault.on('delete', async (file) => {
                if (!(file instanceof TFile)) return;
                const filePath = file.path;
                this.removeVocabularyFile(filePath);
                let duplicateActionChanged = this.cancelPendingDuplicateActionsForPath(filePath);

                if (this.deletionCascadePaths.has(filePath)) {
                    const changed = this.cleanupProcessingStateForPath(filePath);
                    if (changed || duplicateActionChanged) await this.saveSettings();
                    return;
                }

                const linkedFile = this.settings.deleteLinkedFilePair ? this.getLinkedFileForDeletion(file) : null;
                const linkedPath = linkedFile instanceof TFile ? linkedFile.path : null;
                this.suppressDeletedPair(file, linkedFile);
                if (this.settings.deleteLinkedFilePair) {
                    await this.deleteLinkedCompanionOrSource(file, linkedFile);
                }
                let changed = this.cleanupProcessingStateForPath(filePath) || duplicateActionChanged;
                if (linkedPath) {
                    changed = this.cancelPendingDuplicateActionsForPath(linkedPath) || changed;
                    changed = this.cleanupProcessingStateForPath(linkedPath) || changed;
                }
                if (changed) {
                    await this.saveSettings();
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('rename', async (file, oldPath) => {
                if (!(file instanceof TFile)) return;
                this.removeVocabularyFile(oldPath);
                this.indexVocabularyFile(file);
                this.renameActiveRunPairPath(oldPath, file.path);
                this.renamePendingDuplicateActionPath(oldPath, file.path);
                const cachedFingerprint = this.duplicateFingerprintCache.get(oldPath);
                if (cachedFingerprint) {
                    this.duplicateFingerprintCache.delete(oldPath);
                    this.duplicateFingerprintCache.set(file.path, cachedFingerprint);
                }
                if (this.duplicateHandlingCache.has(oldPath)) {
                    this.duplicateHandlingCache.delete(oldPath);
                }
                const cachedCompletion = this.duplicateProcessingCompletion.get(oldPath);
                const cachedCompletionResolver = this.duplicateProcessingCompletionResolvers.get(oldPath);
                if (cachedCompletion) {
                    this.duplicateProcessingCompletion.delete(oldPath);
                    this.duplicateProcessingCompletion.set(file.path, cachedCompletion);
                }
                if (cachedCompletionResolver) {
                    this.duplicateProcessingCompletionResolvers.delete(oldPath);
                    this.duplicateProcessingCompletionResolvers.set(file.path, cachedCompletionResolver);
                }
                const activeRunId = this.currentRunIds.get(oldPath);
                if (activeRunId) {
                    this.currentRunIds.delete(oldPath);
                    this.currentRunIds.set(file.path, activeRunId);
                    if (file.extension.toLowerCase() !== "md") {
                        this.updateActiveRunPair(activeRunId, { imagePath: file.path, expectedNotePath: this.getBfmNotePath(file) });
                    }
                }
                const queuedItem = this.processingQueue.get(oldPath);
                if (queuedItem) {
                    this.processingQueue.delete(oldPath);
                    this.processingQueue.set(file.path, { file, runId: queuedItem.runId });
                }
                if (this.activeWorkerPaths.has(oldPath)) {
                    this.activeWorkerPaths.delete(oldPath);
                    this.activeWorkerPaths.add(file.path);
                }
                const failedFile = this.getFailedFile(oldPath);
                let shouldSaveRenameState = false;
                if (failedFile) {
                    failedFile.path = file.path;
                    shouldSaveRenameState = true;
                }
                const renamedImageNotePath = file.extension.toLowerCase() === "md" ? undefined : this.getBfmNotePath(file);
                if (this.updateDuplicateRecordsForRename(oldPath, file.path, renamedImageNotePath)) {
                    shouldSaveRenameState = true;
                }
                if (this.updateProtectedJobPath(oldPath, file.path, renamedImageNotePath)) {
                    shouldSaveRenameState = true;
                }
                if (this.updatePendingGeocodeJobsForRename(oldPath, file.path)) {
                    shouldSaveRenameState = true;
                }
                const index = this.settings.processedFiles.indexOf(oldPath);
                if (index !== -1) {
                    this.settings.processedFiles.splice(index, 1, file.path);
                    shouldSaveRenameState = true;
                    //new Notice(`Updated processed path: ${oldPath} ? ${file.path}`);
                }
                if (shouldSaveRenameState) {
                    await this.saveSettings();
                }
            })
        );

        this.app.workspace.onLayoutReady(() => {
            void this.resumeProtectedJobs();
            if (this.settings.pendingGeocodeJobs.length > 0) {
                void this.retryQueuedGeolocations(false);
            }
        });
    }

    onunload() {
        if (this.queueFlushTimer !== null) {
            window.clearTimeout(this.queueFlushTimer);
            this.queueFlushTimer = null;
        }

        this.queueBatchStartedAt = null;
        this.processingQueue.clear();
        this.activeWorkerPaths.clear();
        this.activeRunPairs.clear();
        this.pendingDuplicateActions.clear();
        this.pendingManualPairActions.clear();
        this.clearActiveProcessingNotice();
    }

    clampSetting(value: unknown, fallback: number, min: number, max: number): number {
        const parsed = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(parsed)) {
            return fallback;
        }

        return Math.max(min, Math.min(max, Math.round(parsed)));
    }

    cloneSettingsValue<T>(value: T): T {
        return value === undefined ? value : JSON.parse(JSON.stringify(value));
    }

    getSettingsProfileFolderPath(): string {
        const configDir = typeof (this.app.vault as any).configDir === "string"
            ? (this.app.vault as any).configDir
            : ".obsidian";
        const pluginDir = this.manifest.dir || `${configDir}/plugins/${this.manifest.id}`;
        return `${pluginDir}/${SETTINGS_PROFILE_FOLDER_NAME}`.replace(/\\/g, "/").replace(/\/+/g, "/");
    }

    getFullVaultPath(path: string): string | null {
        const adapter = this.app.vault.adapter;
        if (adapter instanceof FileSystemAdapter) {
            return adapter.getFullPath(path);
        }
        const fallbackAdapter = adapter as unknown as { getFullPath?: (path: string) => string };
        return typeof fallbackAdapter.getFullPath === "function" ? fallbackAdapter.getFullPath(path) : null;
    }

    async ensureSettingsProfileFolder(): Promise<string> {
        const folderPath = this.getSettingsProfileFolderPath();
        if (!await this.app.vault.adapter.exists(folderPath)) {
            await this.app.vault.adapter.mkdir(folderPath);
        }
        return folderPath;
    }

    sanitizeSettingsProfileName(name: string | undefined): string {
        const sanitized = (name ?? "")
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
            .replace(/\s+/g, " ")
            .trim();
        return sanitized || "Imported Setup";
    }

    getSettingsProfileFileName(name: string): string {
        return `${this.sanitizeSettingsProfileName(name)}.json`;
    }

    getProfileControlledSettings(source: Partial<BfmAutotagSettings>): Partial<BfmAutotagSettings> {
        const profileSettings: Partial<BfmAutotagSettings> = {};
        SETTINGS_PROFILE_CONTROLLED_KEYS.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                (profileSettings as any)[key] = this.cloneSettingsValue((source as any)[key]);
            }
        });
        return profileSettings;
    }

    getCompleteProfileControlledSettings(source: Partial<BfmAutotagSettings>): Partial<BfmAutotagSettings> {
        return {
            ...this.getProfileControlledSettings(DEFAULT_SETTINGS),
            ...this.getProfileControlledSettings(source),
        };
    }

    serializeSettingsProfileSettings(settings: Partial<BfmAutotagSettings>): string {
        return JSON.stringify(this.getCompleteProfileControlledSettings(settings));
    }

    getBuiltInSettingsProfiles(): SettingsProfileSummary[] {
        const defaultSettings = this.getProfileControlledSettings(DEFAULT_SETTINGS);
        return [
            {
                id: BUILTIN_DEFAULT_SETTINGS_PROFILE_ID,
                name: "Default",
                custom: false,
                builtIn: true,
                settings: defaultSettings,
            },
            {
                id: BUILTIN_DEV_SETTINGS_PROFILE_ID,
                name: "Dev",
                custom: false,
                builtIn: true,
                settings: defaultSettings,
            },
        ];
    }

    parseSettingsProfileJson(text: string, fallbackName: string): SettingsProfileFile {
        const parsed = JSON.parse(text) as SettingsProfileFile | Partial<BfmAutotagSettings>;
        const settings = parsed && typeof parsed === "object" && "settings" in parsed
            ? (parsed as SettingsProfileFile).settings
            : parsed as Partial<BfmAutotagSettings>;
        const name = this.sanitizeSettingsProfileName(
            parsed && typeof parsed === "object" && "name" in parsed && typeof (parsed as SettingsProfileFile).name === "string"
                ? (parsed as SettingsProfileFile).name
                : fallbackName.replace(/\.json$/i, "")
        );
        return {
            name,
            custom: parsed && typeof parsed === "object" && "custom" in parsed ? (parsed as SettingsProfileFile).custom === true : false,
            sourceName: parsed && typeof parsed === "object" && typeof (parsed as SettingsProfileFile).sourceName === "string"
                ? (parsed as SettingsProfileFile).sourceName
                : undefined,
            settings: this.getCompleteProfileControlledSettings(settings ?? {}),
        };
    }

    async readSettingsProfileFile(path: string): Promise<SettingsProfileSummary | null> {
        try {
            const text = await this.app.vault.adapter.read(path);
            const parsed = this.parseSettingsProfileJson(text, path.split("/").pop() ?? "Imported Setup");
            return {
                id: path,
                path,
                name: this.sanitizeSettingsProfileName(parsed.name),
                custom: parsed.custom === true,
                sourceName: parsed.sourceName,
                builtIn: false,
                settings: parsed.settings ?? {},
            };
        } catch (error) {
            console.warn("Maru\'s Autotag could not read settings profile", path, error);
            return null;
        }
    }

    async listSettingsProfiles(): Promise<SettingsProfileSummary[]> {
        const builtIns = this.getBuiltInSettingsProfiles();
        try {
            const folderPath = this.getSettingsProfileFolderPath();
            if (!await this.app.vault.adapter.exists(folderPath)) return builtIns;
            const listed = await this.app.vault.adapter.list(folderPath);
            const loaded = await Promise.all(
                listed.files
                    .filter(path => path.toLowerCase().endsWith(".json"))
                    .map(path => this.readSettingsProfileFile(path))
            );
            const fileProfiles = loaded
                .filter((profile): profile is SettingsProfileSummary => profile !== null)
                .sort((a, b) => a.name.localeCompare(b.name));
            return [...builtIns, ...fileProfiles];
        } catch (error) {
            console.warn("Maru\'s Autotag could not list settings profiles", error);
            return builtIns;
        }
    }

    getActiveSettingsProfileFromList(profiles: SettingsProfileSummary[]): SettingsProfileSummary {
        return profiles.find(profile => profile.id === this.settings.settingsProfileId)
            ?? profiles.find(profile => profile.id === BUILTIN_DEFAULT_SETTINGS_PROFILE_ID)
            ?? this.getBuiltInSettingsProfiles()[0];
    }

    async getAvailableSettingsProfilePath(name: string): Promise<{ name: string; path: string }> {
        const folderPath = await this.ensureSettingsProfileFolder();
        let candidateName = this.sanitizeSettingsProfileName(name);
        let candidatePath = `${folderPath}/${this.getSettingsProfileFileName(candidateName)}`;
        let index = 2;
        while (await this.app.vault.adapter.exists(candidatePath)) {
            candidateName = `${this.sanitizeSettingsProfileName(name)} ${index}`;
            candidatePath = `${folderPath}/${this.getSettingsProfileFileName(candidateName)}`;
            index += 1;
        }
        return { name: candidateName, path: candidatePath };
    }

    async writeSettingsProfileFile(
        name: string,
        settings: Partial<BfmAutotagSettings>,
        custom: boolean,
        sourceName?: string,
        existingPath?: string
    ): Promise<SettingsProfileSummary> {
        const now = Date.now();
        const resolved = existingPath
            ? { name: this.sanitizeSettingsProfileName(name), path: existingPath }
            : await this.getAvailableSettingsProfilePath(name);
        let createdAt = now;
        if (existingPath && await this.app.vault.adapter.exists(existingPath)) {
            const existing = await this.readSettingsProfileFile(existingPath);
            createdAt = existing?.settings ? now : now;
        }
        const profileFile: SettingsProfileFile = {
            name: resolved.name,
            custom,
            sourceName,
            createdAt,
            updatedAt: now,
            settings: this.getCompleteProfileControlledSettings(settings),
        };
        await this.ensureSettingsProfileFolder();
        await this.app.vault.adapter.write(resolved.path, JSON.stringify(profileFile, null, 2));
        return {
            id: resolved.path,
            path: resolved.path,
            name: resolved.name,
            custom,
            sourceName,
            builtIn: false,
            settings: profileFile.settings ?? {},
        };
    }

    async importSettingsProfileJson(text: string, fallbackName: string): Promise<SettingsProfileSummary | null> {
        try {
            const parsed = this.parseSettingsProfileJson(text, fallbackName);
            const imported = await this.writeSettingsProfileFile(
                this.sanitizeSettingsProfileName(parsed.name),
                parsed.settings ?? {},
                false,
                parsed.sourceName
            );
            new Notice(`Imported setup profile: ${imported.name}`);
            return imported;
        } catch (error) {
            console.warn("Maru\'s Autotag settings profile import failed", error);
            new Notice(`Could not import setup profile: ${fallbackName}`);
            return null;
        }
    }

    getSettingsProfileExportFileName(profileName: string): string {
        return this.getSettingsProfileFileName(profileName);
    }

    getDefaultSettingsProfileExportPath(fileName: string): string {
        const folderPath = this.getSettingsProfileFolderPath();
        const fullFolderPath = this.getFullVaultPath(folderPath);
        if (!fullFolderPath) return fileName;
        const path = require("path") as typeof import("path");
        return path.join(fullFolderPath, fileName);
    }

    async showSettingsProfileSaveDialog(defaultPath: string): Promise<string | null | undefined> {
        const options = {
            title: "Export Maru\'s Autotag setup",
            defaultPath,
            filters: [{ name: "JSON", extensions: ["json"] }],
        };
        const openDialog = async (dialog: any, currentWindow?: unknown): Promise<string | null | undefined> => {
            if (!dialog || typeof dialog.showSaveDialog !== "function") return undefined;
            const result = currentWindow
                ? await dialog.showSaveDialog(currentWindow, options)
                : await dialog.showSaveDialog(options);
            if (result?.canceled) return null;
            return typeof result?.filePath === "string" && result.filePath.trim() ? result.filePath : null;
        };

        try {
            const electron = require("electron") as any;
            const remoteResult = await openDialog(electron.remote?.dialog, electron.remote?.getCurrentWindow?.());
            if (remoteResult !== undefined) return remoteResult;
            const directResult = await openDialog(electron.dialog);
            if (directResult !== undefined) return directResult;
        } catch (error) {
            console.warn("Maru\'s Autotag settings profile save dialog unavailable", error);
        }

        return undefined;
    }

    async writeLocalTextFile(path: string, text: string): Promise<void> {
        const fs = require("fs/promises") as typeof import("fs/promises");
        await fs.writeFile(path, text, "utf8");
    }

    async copySettingsProfileExportToClipboard(text: string): Promise<void> {
        await navigator.clipboard.writeText(text);
        new Notice("Could not open a save window, so the setup JSON was copied to the clipboard.");
    }

    async exportCurrentSettingsProfile(): Promise<boolean> {
        try {
            const profiles = await this.listSettingsProfiles();
            const active = this.getActiveSettingsProfileFromList(profiles);
            const now = Date.now();
            const profileName = active.name;
            const activeIsCustom = active.custom || this.isNamedCustomSettingsProfile(active);
            const profileFile: SettingsProfileFile = {
                name: profileName,
                custom: activeIsCustom,
                sourceName: activeIsCustom ? active.sourceName ?? this.getEditableSettingsProfileName(active.name) : active.name,
                createdAt: now,
                updatedAt: now,
                settings: this.getCompleteProfileControlledSettings(this.settings),
            };
            const json = JSON.stringify(profileFile, null, 2);
            const exportPath = await this.showSettingsProfileSaveDialog(
                this.getDefaultSettingsProfileExportPath(this.getSettingsProfileExportFileName(profileName))
            );
            if (exportPath === null) {
                new Notice("Settings export canceled.");
                return false;
            }
            if (!exportPath) {
                await this.copySettingsProfileExportToClipboard(json);
                return true;
            }
            await this.writeLocalTextFile(exportPath, json);
            new Notice(`Exported setup profile: ${profileName}`);
            return true;
        } catch (error) {
            console.warn("Maru\'s Autotag settings profile export failed", error);
            new Notice("Could not export setup profile.");
            return false;
        }
    }

    async applySettingsProfile(profileId: string): Promise<void> {
        const profiles = await this.listSettingsProfiles();
        const profile = profiles.find(item => item.id === profileId);
        if (!profile) {
            new Notice("Setup profile not found.");
            return;
        }

        this.isApplyingSettingsProfile = true;
        try {
            const settingsToApply = this.getCompleteProfileControlledSettings(profile.settings);
            SETTINGS_PROFILE_CONTROLLED_KEYS.forEach(key => {
                (this.settings as any)[key] = this.cloneSettingsValue((settingsToApply as any)[key]);
            });
            this.settings.settingsProfileId = profile.id;
            this.settingsProfileSnapshot = this.serializeSettingsProfileSettings(this.settings);
            await this.saveData(this.settings);
            new Notice(`Selected setup profile: ${profile.name}`);
        } finally {
            this.isApplyingSettingsProfile = false;
        }
    }

    async renameActiveCustomSettingsProfile(newName: string): Promise<SettingsProfileSummary | null> {
        const profiles = await this.listSettingsProfiles();
        const active = this.getActiveSettingsProfileFromList(profiles);
        if (!this.isEditableCustomSettingsProfile(active)) {
            new Notice("Only [Custom] setup profiles can be renamed.");
            return null;
        }

        const cleanedName = (newName ?? "")
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\s*\[Custom\]$/i, "")
            .trim();
        if (!cleanedName) {
            new Notice("Enter a profile name first.");
            return null;
        }
        const requestedName = this.getCustomSettingsProfileName(cleanedName);

        const folderPath = await this.ensureSettingsProfileFolder();
        let targetName = requestedName;
        let targetPath = `${folderPath}/${this.getSettingsProfileFileName(targetName)}`;
        if (targetPath !== active.path && await this.app.vault.adapter.exists(targetPath)) {
            const available = await this.getAvailableSettingsProfilePath(targetName);
            targetName = available.name;
            targetPath = available.path;
        }

        const renamed = await this.writeSettingsProfileFile(
            targetName,
            this.settings,
            true,
            active.sourceName,
            targetPath
        );
        if (active.path !== renamed.path && await this.app.vault.adapter.exists(active.path)) {
            await this.app.vault.adapter.remove(active.path);
        }
        this.settings.settingsProfileId = renamed.id;
        this.settingsProfileSnapshot = this.serializeSettingsProfileSettings(this.settings);
        await this.saveData(this.settings);
        new Notice(`Renamed setup profile to ${renamed.name}.`);
        return renamed;
    }

    async deleteActiveSettingsProfile(): Promise<boolean> {
        const profiles = await this.listSettingsProfiles();
        const active = this.getActiveSettingsProfileFromList(profiles);
        if (active.builtIn || !active.path) {
            new Notice("Built-in setup profiles cannot be deleted.");
            return false;
        }
        if (await this.app.vault.adapter.exists(active.path)) {
            await this.app.vault.adapter.remove(active.path);
        }
        await this.applySettingsProfile(BUILTIN_DEFAULT_SETTINGS_PROFILE_ID);
        new Notice(`Deleted setup profile: ${active.name}`);
        return true;
    }

    isDevSettingsProfile(profile: SettingsProfileSummary | null | undefined): boolean {
        return !!profile && (profile.id === BUILTIN_DEV_SETTINGS_PROFILE_ID || profile.name.trim().toLowerCase() === "dev");
    }

    hasCustomSettingsProfileMarker(profileName: string | undefined): boolean {
        return /\[Custom\]/i.test(profileName ?? "");
    }

    isNamedCustomSettingsProfile(profile: SettingsProfileSummary | null | undefined): boolean {
        return !!profile && this.hasCustomSettingsProfileMarker(profile.name);
    }

    isEditableCustomSettingsProfile(profile: SettingsProfileSummary | null | undefined): profile is SettingsProfileSummary & { path: string } {
        return !!profile && !profile.builtIn && !!profile.path && (profile.custom || this.isNamedCustomSettingsProfile(profile));
    }

    getEditableSettingsProfileName(profileName: string): string {
        return profileName.replace(/\s*\[Custom\]\s*/gi, " ").replace(/\s+/g, " ").trim();
    }

    getCustomSettingsProfileName(profileName: string): string {
        const cleanName = this.sanitizeSettingsProfileName(profileName);
        return this.hasCustomSettingsProfileMarker(cleanName)
            ? cleanName
            : `${cleanName}${SETTINGS_PROFILE_CUSTOM_SUFFIX}`;
    }

    async syncActiveSettingsProfileBeforeSave(): Promise<void> {
        if (this.isApplyingSettingsProfile) return;
        const currentSnapshot = this.serializeSettingsProfileSettings(this.settings);
        if (!this.settingsProfileSnapshot) {
            this.settingsProfileSnapshot = currentSnapshot;
            return;
        }
        if (currentSnapshot === this.settingsProfileSnapshot) return;

        try {
            const profiles = await this.listSettingsProfiles();
            const active = this.getActiveSettingsProfileFromList(profiles);
            const currentProfileSettings = this.getCompleteProfileControlledSettings(this.settings);
            if (this.isEditableCustomSettingsProfile(active)) {
                await this.writeSettingsProfileFile(active.name, currentProfileSettings, true, active.sourceName, active.path);
            } else {
                const customProfile = await this.writeSettingsProfileFile(
                    this.getCustomSettingsProfileName(active.name),
                    currentProfileSettings,
                    true,
                    active.name
                );
                this.settings.settingsProfileId = customProfile.id;
                new Notice(`Created custom setup profile: ${customProfile.name}`);
            }
            this.settingsProfileSnapshot = this.serializeSettingsProfileSettings(this.settings);
        } catch (error) {
            console.warn("Maru\'s Autotag could not sync setup profile", error);
        }
    }

    async loadSettings() {
        const loadedSettings = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedSettings);
        this.settings.settingsProfileId = typeof this.settings.settingsProfileId === "string" && this.settings.settingsProfileId.trim()
            ? this.settings.settingsProfileId
            : BUILTIN_DEFAULT_SETTINGS_PROFILE_ID;
        const normalizeLinguisticFeatures = (loaded: Record<string, unknown> | undefined): LinguisticFeatureSettings => {
            const normalized = { ...DEFAULT_LINGUISTIC_FEATURES };
            (Object.keys(normalized) as LinguisticFeatureKey[]).forEach(key => {
                const value = loaded?.[key];
                if (value === "exclude" || value === "base" || value === "use") {
                    normalized[key] = value;
                } else if (typeof value === "boolean") {
                    normalized[key] = value ? "use" : "exclude";
                }
            });
            return normalized;
        };
        this.settings.bridgeLinguisticFeatures = normalizeLinguisticFeatures(loadedSettings?.bridgeLinguisticFeatures);
        this.settings.vaultLinguisticFeatures = normalizeLinguisticFeatures(loadedSettings?.vaultLinguisticFeatures);
        this.settings.bridgeEnabled = this.settings.bridgeEnabled === true;
        this.settings.hideBridgeLinguisticFeatures = this.settings.hideBridgeLinguisticFeatures !== false;
        this.settings.hideVaultLinguisticFeatures = this.settings.hideVaultLinguisticFeatures !== false;


        if (!Array.isArray(this.settings.failedFiles)) {
            this.settings.failedFiles = [];
        }
        this.settings.shutdownProtectionEnabled = this.settings.shutdownProtectionEnabled === true;
        this.settings.autoProcessUnprocessedOnReload = this.settings.autoProcessUnprocessedOnReload === true;
        this.settings.deleteLinkedFilePair = this.settings.deleteLinkedFilePair !== false;
        this.settings.createMissingCompanionNote = this.settings.createMissingCompanionNote !== false;
        this.settings.deleteLonelyFileWithoutCompanion = this.settings.deleteLonelyFileWithoutCompanion === true;
        this.settings.lonelyDeletedImageCount = Number.isFinite(Number(this.settings.lonelyDeletedImageCount)) ? Math.max(0, Math.round(Number(this.settings.lonelyDeletedImageCount))) : DEFAULT_SETTINGS.lonelyDeletedImageCount;
        this.settings.useDuplicateProtection = this.settings.useDuplicateProtection !== false;
        const validShutdownStages: ShutdownProtectionStage[] = ["queued", "fingerprinted", "duplicate-decision", "waiting-duplicate-choice", "waiting-bfm-note", "processing", "writing"];
        if (!Array.isArray(this.settings.protectedJobs)) {
            this.settings.protectedJobs = [];
        } else {
            const seenProtectedJobs = new Set<string>();
            const normalizeProtectedJobSource = (source: unknown): ProtectedJobSource => source === "manual-vault-reprocess" ? "manual-vault-reprocess" : "shutdown";
            this.settings.protectedJobs = this.settings.protectedJobs
                .filter(job => job && typeof job.path === "string" && job.path.trim().length > 0 && (job as { source?: unknown }).source !== "forget-all")
                .map(job => ({
                    ...job,
                    path: job.path.trim(),
                    stage: validShutdownStages.includes(job.stage) ? job.stage : "queued",
                    queuedAt: typeof job.queuedAt === "number" ? job.queuedAt : Date.now(),
                    updatedAt: typeof job.updatedAt === "number" ? job.updatedAt : Date.now(),
                    source: normalizeProtectedJobSource(job.source),
                }))
                .filter(job => {
                    if (seenProtectedJobs.has(job.path)) return false;
                    seenProtectedJobs.add(job.path);
                    return true;
                });
        }
        if (!this.settings.shutdownProtectionEnabled && this.settings.protectedJobs.length > 0) {
            this.settings.protectedJobs = [];
        }
        if (!Array.isArray(this.settings.excludedVocabularyTerms)) {
            this.settings.excludedVocabularyTerms = [...DEFAULT_SETTINGS.excludedVocabularyTerms];
        }
        if (typeof this.settings.basePath !== "string" || this.settings.basePath.trim().length === 0) {
            this.settings.basePath = DEFAULT_SETTINGS.basePath;
        }
        if (typeof this.settings.bfmNewFileLocation !== "string" || this.settings.bfmNewFileLocation.trim().length === 0) {
            this.settings.bfmNewFileLocation = DEFAULT_SETTINGS.bfmNewFileLocation;
        }
        if (typeof this.settings.ollamaBaseUrl !== "string" || this.settings.ollamaBaseUrl.trim().length === 0) {
            this.settings.ollamaBaseUrl = DEFAULT_SETTINGS.ollamaBaseUrl;
        }
        if (typeof this.settings.bfmFileNameFormat !== "string" || this.settings.bfmFileNameFormat.trim().length === 0) {
            this.settings.bfmFileNameFormat = DEFAULT_SETTINGS.bfmFileNameFormat;
        }
        this.settings.folderPropertyMappings = this.normalizeFolderPropertyMappings(this.settings.folderPropertyMappings);
        if (this.settings.folderPropertyMappings.length === 0) {
            this.settings.folderPropertyMappings = DEFAULT_SETTINGS.folderPropertyMappings.map(mapping => ({ ...mapping, values: [...mapping.values] }));
        }
        this.settings.folderFallbackProperty = this.normalizeFolderFallbackProperty(this.settings.folderFallbackProperty);
        this.settings.folderFallbackFormat = typeof this.settings.folderFallbackFormat === "string" ? this.settings.folderFallbackFormat : DEFAULT_SETTINGS.folderFallbackFormat;
        this.settings.folderFallbackUseAsAiCandidate = this.settings.folderFallbackUseAsAiCandidate !== false;
        this.settings.folderFallbackUseAsVaultCandidate = this.settings.folderFallbackUseAsVaultCandidate !== false;
        if (this.settings.templateSource !== "internal" && this.settings.templateSource !== "bfm-templater") {
            this.settings.templateSource = DEFAULT_SETTINGS.templateSource;
        }
        if (typeof this.settings.frontmatterTemplate !== "string") {
            this.settings.frontmatterTemplate = DEFAULT_SETTINGS.frontmatterTemplate;
        }
        this.settings.useFolderTags = this.settings.useFolderTags !== false;
        this.settings.writeImageEmbedInBody = this.settings.writeImageEmbedInBody !== false;
        this.settings.geolocationEnabled = this.settings.geolocationEnabled !== false;
        const validGeolocationProviders: GeolocationProvider[] = ["disabled", "public-nominatim", "local-nominatim"];
        if (!validGeolocationProviders.includes(this.settings.geolocationProvider)) {
            this.settings.geolocationProvider = DEFAULT_SETTINGS.geolocationProvider;
        }
        this.settings.geolocationLocalUrl = typeof this.settings.geolocationLocalUrl === "string" && this.settings.geolocationLocalUrl.trim()
            ? this.settings.geolocationLocalUrl.trim()
            : DEFAULT_SETTINGS.geolocationLocalUrl;
        this.settings.geolocationProperties = this.getGeolocationProperties();
        if (this.settings.geolocationProperties.length === 0) {
            this.settings.geolocationProperties = [...DEFAULT_SETTINGS.geolocationProperties];
        }
        this.settings.geocodeCache = this.settings.geocodeCache && typeof this.settings.geocodeCache === "object" && !Array.isArray(this.settings.geocodeCache)
            ? this.settings.geocodeCache
            : {};
        this.settings.pendingGeocodeJobs = Array.isArray(this.settings.pendingGeocodeJobs)
            ? this.settings.pendingGeocodeJobs
                .filter(job => job && typeof job.imagePath === "string" && typeof job.notePath === "string" && typeof job.latitude === "number" && typeof job.longitude === "number")
                .map(job => ({
                    imagePath: job.imagePath,
                    notePath: job.notePath,
                    latitude: job.latitude,
                    longitude: job.longitude,
                    attempts: typeof job.attempts === "number" ? job.attempts : 0,
                    queuedAt: typeof job.queuedAt === "number" ? job.queuedAt : Date.now(),
                    nextTryAt: typeof job.nextTryAt === "number" ? job.nextTryAt : Date.now(),
                    lastError: typeof job.lastError === "string" ? job.lastError : undefined,
                }))
            : [];
        this.settings.geocodePublicDay = typeof this.settings.geocodePublicDay === "string" ? this.settings.geocodePublicDay : "";
        this.settings.geocodePublicRequestsToday = this.clampSetting(this.settings.geocodePublicRequestsToday, 0, 0, PUBLIC_NOMINATIM_DAILY_CAP);
        this.settings.geocodeLastRequestAt = typeof this.settings.geocodeLastRequestAt === "number" ? this.settings.geocodeLastRequestAt : 0;
        const validDuplicateModes: DuplicateDetectionMode[] = ["off", "exact", "exact-visual"];
        const validDuplicateActions: DuplicateAction[] = ["ask", "process", "delete-new-pair", "replace-original-keep-original", "replace-original-keep-new"];
        if (!validDuplicateModes.includes(this.settings.duplicateDetectionMode)) {
            this.settings.duplicateDetectionMode = DEFAULT_SETTINGS.duplicateDetectionMode;
        }
        if (!validDuplicateActions.includes(this.settings.exactDuplicateAction)) {
            this.settings.exactDuplicateAction = DEFAULT_SETTINGS.exactDuplicateAction;
        }
        if (!validDuplicateActions.includes(this.settings.visualDuplicateAction)) {
            this.settings.visualDuplicateAction = DEFAULT_SETTINGS.visualDuplicateAction;
        }
        this.settings.visualDuplicateThreshold = this.clampSetting(this.settings.visualDuplicateThreshold, DEFAULT_SETTINGS.visualDuplicateThreshold, 0, 32);
        this.settings.duplicateMigrateLinksOnReplace = this.settings.duplicateMigrateLinksOnReplace === true;
        this.settings.duplicateAutorenameOnReplace = this.settings.duplicateAutorenameOnReplace !== false;
        this.settings.waitForDuplicateSourceProcessing = this.settings.waitForDuplicateSourceProcessing !== false;
        if (!Array.isArray(this.settings.duplicateRecords)) {
            this.settings.duplicateRecords = [];
        }
        if (!Array.isArray(this.settings.pairRecords)) {
            this.settings.pairRecords = [];
        } else {
            const seenPairs = new Set<string>();
            this.settings.pairRecords = this.settings.pairRecords
                .filter(record => record && typeof record.pairId === "string" && typeof record.imagePath === "string")
                .filter(record => {
                    if (seenPairs.has(record.pairId)) return false;
                    seenPairs.add(record.pairId);
                    return true;
                })
                .map(record => ({
                    pairId: record.pairId,
                    imagePath: record.imagePath,
                    notePath: typeof record.notePath === "string" ? record.notePath : undefined,
                    createdAt: typeof record.createdAt === "number" ? record.createdAt : Date.now(),
                    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : Date.now(),
                }));
        }
        this.backfillPairRecordsFromDuplicateRecords();
        const validCandidateModes = ["disabled", "consider", "all", "exclude"];
        if (!validCandidateModes.includes(this.settings.filenameCandidateMode)) {
            this.settings.filenameCandidateMode = DEFAULT_SETTINGS.filenameCandidateMode;
        }
        if (!validCandidateModes.includes(this.settings.folderTagsCandidateMode)) {
            this.settings.folderTagsCandidateMode = DEFAULT_SETTINGS.folderTagsCandidateMode;
        }
        this.settings.bridgeUsePreBridgeVaultAwarenessOutput = this.settings.bridgeUsePreBridgeVaultAwarenessOutput !== false;

        this.settings.parallelWorkers = this.clampSetting(
            this.settings.parallelWorkers,
            DEFAULT_SETTINGS.parallelWorkers,
            1,
            16
        );
        if (loadedSettings?.bfmNoteMaxWaitMs === 15000) {
            this.settings.bfmNoteMaxWaitMs = DEFAULT_SETTINGS.bfmNoteMaxWaitMs;
        }
        this.settings.bfmNoteMaxWaitMs = this.clampSetting(
            this.settings.bfmNoteMaxWaitMs,
            DEFAULT_SETTINGS.bfmNoteMaxWaitMs,
            500,
            30000
        );
        this.settings.bfmNotePollIntervalMs = this.clampSetting(
            this.settings.bfmNotePollIntervalMs,
            DEFAULT_SETTINGS.bfmNotePollIntervalMs,
            100,
            5000
        );
        this.settings.queueBatchMaxWaitMs = this.clampSetting(
            this.settings.queueBatchMaxWaitMs,
            DEFAULT_SETTINGS.queueBatchMaxWaitMs,
            1000,
            60000
        );
        this.settings.maxProcessingAttempts = this.clampSetting(
            this.settings.maxProcessingAttempts,
            DEFAULT_SETTINGS.maxProcessingAttempts,
            1,
            10
        );
        this.settings.maxPromptVocabularyTerms = this.clampSetting(
            this.settings.maxPromptVocabularyTerms,
            DEFAULT_SETTINGS.maxPromptVocabularyTerms,
            5,
            300
        );
        this.settings.vaultAwarenessEnabled = this.settings.vaultAwarenessEnabled === true;
        this.settings.maxVaultAwareAdditions = this.clampSetting(
            this.settings.maxVaultAwareAdditions,
            DEFAULT_SETTINGS.maxVaultAwareAdditions,
            1,
            100
        );
        this.settings.vaultAwarenessOutputEnabled = this.settings.vaultAwarenessOutputEnabled === true;
        this.settings.vaultAwarenessOutputPropertyName = this.normalizePropertyName(this.settings.vaultAwarenessOutputPropertyName, DEFAULT_SETTINGS.vaultAwarenessOutputPropertyName);
        this.settings.vaultAwarenessOutputFormat = typeof this.settings.vaultAwarenessOutputFormat === "string" ? this.settings.vaultAwarenessOutputFormat : DEFAULT_SETTINGS.vaultAwarenessOutputFormat;
        this.settings.vaultAwarenessOutputExclusive = this.settings.vaultAwarenessOutputExclusive === true;
        this.settings.clearDropdownExcludedProperties = Array.isArray(this.settings.clearDropdownExcludedProperties)
            ? Array.from(new Set(this.settings.clearDropdownExcludedProperties.map(property => this.normalizePropertyName(property, "")).filter(Boolean))).sort((a, b) => a.localeCompare(b))
            : DEFAULT_SETTINGS.clearDropdownExcludedProperties;
        this.settings.hideLimitedFileTypeWarnings = this.settings.hideLimitedFileTypeWarnings !== false;
        const loadedLimitedFileTypeWarningSkips = this.settings.limitedFileTypeWarningSkips;
        const normalizedLimitedFileTypeWarningSkips: Record<string, boolean> = {};
        LIMITED_FILE_TYPE_WARNINGS.forEach(definition => {
            normalizedLimitedFileTypeWarningSkips[definition.extension] = !!(
                loadedLimitedFileTypeWarningSkips
                && typeof loadedLimitedFileTypeWarningSkips === "object"
                && !Array.isArray(loadedLimitedFileTypeWarningSkips)
                && loadedLimitedFileTypeWarningSkips[definition.extension] === true
            );
        });
        this.settings.limitedFileTypeWarningSkips = normalizedLimitedFileTypeWarningSkips;
        this.settings.linkToFilePropertyEnabled = this.settings.linkToFilePropertyEnabled !== false;
        this.settings.fileTypePropertyEnabled = this.settings.fileTypePropertyEnabled !== false;
        this.settings.embedPropertyEnabled = this.settings.embedPropertyEnabled !== false;
        this.settings.aiTagsPropertyEnabled = this.settings.aiTagsPropertyEnabled !== false;
        this.settings.aiDescriptionPropertyEnabled = this.settings.aiDescriptionPropertyEnabled !== false;
        this.settings.linkToFilePropertyName = this.normalizePropertyName(this.settings.linkToFilePropertyName, DEFAULT_SETTINGS.linkToFilePropertyName);
        this.settings.fileTypePropertyName = this.normalizePropertyName(this.settings.fileTypePropertyName, DEFAULT_SETTINGS.fileTypePropertyName);
        this.settings.embedPropertyName = this.normalizePropertyName(this.settings.embedPropertyName, DEFAULT_SETTINGS.embedPropertyName);
        this.settings.aiTagsPropertyName = this.normalizePropertyName(this.settings.aiTagsPropertyName, DEFAULT_SETTINGS.aiTagsPropertyName);
        this.settings.aiTagsFormat = typeof this.settings.aiTagsFormat === "string" ? this.settings.aiTagsFormat : DEFAULT_SETTINGS.aiTagsFormat;
        this.settings.aiTagsUseAsVaultCandidate = this.settings.aiTagsUseAsVaultCandidate !== false;
        this.settings.aiDescriptionPropertyName = this.normalizePropertyName(this.settings.aiDescriptionPropertyName, DEFAULT_SETTINGS.aiDescriptionPropertyName);
        this.settings.useGeolocationForAiDescription = this.settings.useGeolocationForAiDescription !== false;
        const parsedOllamaTagsCap = Number(this.settings.ollamaGeneratedTagsCap);
        this.settings.ollamaGeneratedTagsCap = Number.isFinite(parsedOllamaTagsCap) && parsedOllamaTagsCap >= 0
            ? Math.round(parsedOllamaTagsCap)
            : DEFAULT_SETTINGS.ollamaGeneratedTagsCap;
        delete (this.settings as any).vocabularyCandidateProperties;
        this.settingsProfileSnapshot = this.serializeSettingsProfileSettings(this.settings);
    }

    async saveSettings() {
        await this.syncActiveSettingsProfileBeforeSave();
        await this.saveData(this.settings);
    }
}


class DuplicateDecisionModal extends Modal {
    constructor(
        app: App,
        private readonly plugin: BfmAutotagPlugin,
        private readonly file: TFile,
        private readonly notePath: string,
        private readonly match: DuplicateMatch,
        private readonly resolveDecision: (decision: DuplicateDecision) => void,
        private readonly runId?: string
    ) {
        super(app);
    }

    private decisionMade = false;
    private liveRefreshTimer: number | null = null;
    private liveRefreshInFlight = false;
    private liveRefreshers: Array<() => void | Promise<void>> = [];

    private resolveDuplicateDecision(decision: DuplicateDecision): void {
        if (this.decisionMade) return;
        this.decisionMade = true;
        this.resolveDecision(decision);
        this.close();
    }

    private getExistingDuplicateLivePaths(): { imagePath: string; notePath: string } {
        const pair = this.plugin.getPairRecordForImagePath(this.match.record.filePath)
            ?? this.plugin.getPairRecordForNotePath(this.match.record.notePath);
        return {
            imagePath: pair?.imagePath ?? this.match.record.filePath,
            notePath: pair?.notePath ?? this.match.record.notePath,
        };
    }

    private getNewDuplicateLivePaths(): { imagePath: string; notePath: string } {
        const activePair = this.runId ? this.plugin.activeRunPairs.get(this.runId) : null;
        const pendingAction = this.runId ? this.plugin.pendingDuplicateActions.get(this.runId) : null;
        let imagePath = activePair?.imagePath ?? pendingAction?.newImagePath ?? this.file.path;
        let notePath = activePair?.resolvedNotePath
            ?? pendingAction?.newNotePath
            ?? activePair?.expectedNotePath
            ?? this.notePath;

        const image = this.plugin.app.vault.getAbstractFileByPath(imagePath);
        const pair = this.plugin.getPairRecordForImagePath(imagePath) ?? this.plugin.getPairRecordForNotePath(notePath);
        if (pair?.imagePath) imagePath = pair.imagePath;
        if (pair?.notePath) notePath = pair.notePath;

        if (image instanceof TFile) {
            const resolvedNote = this.plugin.findCompanionNoteForSourceFile(image);
            if (resolvedNote instanceof TFile) notePath = resolvedNote.path;
        }

        return { imagePath, notePath };
    }

    private getComparisonProcessingStatus(imagePath: string, notePath: string, role: "existing" | "new"): { label: string; tone: HealthCheckTone | "accent"; spinner?: boolean } {
        const image = this.plugin.app.vault.getAbstractFileByPath(imagePath);
        const note = this.plugin.app.vault.getAbstractFileByPath(notePath);
        const failedFile = this.plugin.getFailedFile(imagePath);
        const protectedJob = this.plugin.getProtectedJob(imagePath);
        const duplicateRecord = this.plugin.getDuplicateRecords().find(record => record.filePath === imagePath || record.notePath === notePath);
        const activelyProcessing = this.plugin.isPathActivelyProcessing(imagePath) || this.plugin.isPathActivelyProcessing(notePath);
        const pendingAction = role === "new" && this.runId ? this.plugin.pendingDuplicateActions.get(this.runId) : null;

        if (!(image instanceof TFile)) return { label: "Image missing", tone: "danger" };
        if (!(note instanceof TFile)) return { label: "Waiting for companion note", tone: "warning", spinner: activelyProcessing };
        if (role === "new" && pendingAction?.processingComplete) return { label: "Processed", tone: "success" };
        if (role === "new" && protectedJob?.stage === "waiting-duplicate-choice") return { label: "Processed", tone: "success" };
        if (role === "new" && protectedJob?.stage === "duplicate-decision" && this.plugin.settings.waitForDuplicateSourceProcessing) return { label: "Waiting for decision", tone: "warning" };
        if (activelyProcessing) return { label: "Processing", tone: "accent", spinner: true };
        if (failedFile) return { label: `Failed after ${failedFile.attempts} attempt${failedFile.attempts === 1 ? "" : "s"}`, tone: "danger" };
        if (this.plugin.settings.processedFiles.includes(imagePath)) return { label: "Processed", tone: "success" };
        if (role === "existing" && duplicateRecord) return { label: "Processed", tone: "success" };
        if (protectedJob) return { label: `Queued: ${protectedJob.stage.replace(/-/g, " ")}`, tone: "warning" };
        if (duplicateRecord) return { label: "Indexed for duplicate protection", tone: "neutral" };
        return { label: "Unprocessed", tone: "neutral" };
    }

    private renderComparisonProcessingStatus(statusEl: HTMLElement, imagePath: string, notePath: string, role: "existing" | "new"): void {
        const status = this.getComparisonProcessingStatus(imagePath, notePath, role);
        statusEl.empty();
        statusEl.removeClasses([
            "is-success",
            "is-warning",
            "is-danger",
            "is-accent",
            "is-neutral",
        ]);
        statusEl.addClass(`is-${status.tone}`);
        if (status.spinner) {
            const spinnerEl = statusEl.createSpan({ cls: "bfm-autotag-duplicate-status-spinner" });
            setIcon(spinnerEl, "loader-circle");
        }
        statusEl.createSpan({ text: status.label });
    }

    private startLiveRefresh(): void {
        this.stopLiveRefresh(false);
        const refresh = async () => {
            if (this.liveRefreshInFlight) return;
            this.liveRefreshInFlight = true;
            try {
                for (const refresher of this.liveRefreshers) {
                    await refresher();
                }
            } finally {
                this.liveRefreshInFlight = false;
            }
        };
        void refresh();
        this.liveRefreshTimer = window.setInterval(() => void refresh(), 700);
    }

    private stopLiveRefresh(clearRefreshers = true): void {
        if (this.liveRefreshTimer !== null) {
            window.clearInterval(this.liveRefreshTimer);
            this.liveRefreshTimer = null;
        }
        this.liveRefreshInFlight = false;
        if (clearRefreshers) this.liveRefreshers = [];
    }

    async onOpen(): Promise<void> {
        const { contentEl, modalEl } = this;
        contentEl.empty();
        this.stopLiveRefresh();
        modalEl.style.width = "min(1100px, 96vw)";
        modalEl.style.maxWidth = "96vw";
        contentEl.style.width = "100%";
        contentEl.style.maxWidth = "none";

        const explanation = this.match.type === "exact"
            ? "This file has the same exact content hash as an already processed image. Compare both sides before choosing how Maru\'s Autotag should continue."
            : `This file looks visually similar to an already processed image (${this.match.similarity ?? "unknown"}% similarity). Compare both sides before choosing how Maru\'s Autotag should continue.`;
        const header = contentEl.createDiv();
        header.style.background = "#ffe3e3";
        header.style.color = "#7f1d1d";
        header.style.borderLeft = "4px solid #d9480f";
        header.style.borderRadius = "8px";
        header.style.padding = "10px 12px";
        header.style.marginBottom = "12px";
        const titleRow = header.createDiv();
        titleRow.style.display = "flex";
        titleRow.style.alignItems = "center";
        const titleEl = titleRow.createEl("h2", { text: this.match.type === "exact" ? "Duplicate Image Found" : "Possible Duplicate Image Found", attr: { title: explanation } });
        titleEl.style.margin = "0";
        createInfoIcon(titleRow, explanation);

        const initialExistingPaths = this.getExistingDuplicateLivePaths();
        const initialNewPaths = this.getNewDuplicateLivePaths();
        const existingNoteContent = await this.plugin.getCompanionNoteContent(initialExistingPaths.notePath);
        const newNoteContent = await this.plugin.getCompanionNoteContent(initialNewPaths.notePath);
        const existingPair = this.plugin.getPairRecordForImagePath(initialExistingPaths.imagePath) ?? this.plugin.getPairRecordForNotePath(initialExistingPaths.notePath);
        const newPair = this.plugin.getPairRecordForImagePath(initialNewPaths.imagePath) ?? this.plugin.getPairRecordForNotePath(initialNewPaths.notePath);

        const getNoteSummary = (content: string): string => {
            if (!content.trim()) return "No companion note content found yet.";
            const tags = this.plugin.getAiTagsFromNoteContent(content).slice(0, 18);
            const descriptionProperty = this.plugin.getAiDescriptionPropertyName();
            const descriptionMatch = content.match(new RegExp(`${descriptionProperty}\\s*:\\s*(?:\\|-)?([\\s\\S]*?)(?:\\n\\S|$)`, "i"));
            const description = descriptionMatch?.[1]?.replace(/^\s+/gm, "").trim();
            const lines = [
                tags.length > 0 ? `${this.plugin.getAiTagsPropertyName()}: ${tags.join(", ")}` : `${this.plugin.getAiTagsPropertyName()}: none found`,
                description ? `${descriptionProperty}: ${description.slice(0, 650)}${description.length > 650 ? "..." : ""}` : `${descriptionProperty}: none found`,
            ];
            return lines.join("\n\n");
        };

        const createMetaLine = (parent: HTMLElement, label: string, value: string): HTMLSpanElement => {
            const row = parent.createDiv();
            row.style.marginTop = "4px";
            row.createEl("strong", { text: `${label}: ` });
            const span = row.createEl("span", { text: value });
            span.style.wordBreak = "break-word";
            return span;
        };

        function createInfoIcon(parent: HTMLElement, tooltip: string) {
            const icon = parent.createEl("span", { text: "i", attr: { title: tooltip } });
            icon.style.display = "inline-flex";
            icon.style.alignItems = "center";
            icon.style.justifyContent = "center";
            icon.style.width = "16px";
            icon.style.height = "16px";
            icon.style.marginLeft = "6px";
            icon.style.borderRadius = "50%";
            icon.style.border = "1px solid currentColor";
            icon.style.fontSize = "11px";
            icon.style.fontWeight = "700";
            icon.style.lineHeight = "1";
            icon.style.opacity = "0.8";
            icon.style.cursor = "help";
            return icon;
        }

        const createAnimatedSection = (parent: HTMLElement, title: string, buildContent: (body: HTMLElement) => void, initiallyOpen = false) => {
            const section = parent.createDiv();
            section.style.marginTop = "8px";
            const button = section.createEl("button", { text: `${initiallyOpen ? "v" : ">"} ${title}` });
            button.type = "button";
            button.style.width = "100%";
            button.style.textAlign = "left";
            button.style.border = "1px solid var(--background-modifier-border)";
            button.style.borderRadius = "6px";
            button.style.padding = "6px 8px";
            button.style.background = "var(--background-primary)";
            button.style.color = "var(--text-normal)";
            button.style.cursor = "pointer";
            const bodyWrap = section.createDiv();
            bodyWrap.style.overflow = "hidden";
            bodyWrap.style.maxHeight = "0px";
            bodyWrap.style.opacity = "0";
            bodyWrap.style.transform = "translateY(-4px)";
            bodyWrap.style.transition = "max-height 220ms ease, opacity 180ms ease, transform 180ms ease";
            const body = bodyWrap.createDiv();
            body.style.paddingTop = "8px";
            buildContent(body);
            let isOpen = false;
            const refreshHeight = () => {
                if (!isOpen) return;
                bodyWrap.style.maxHeight = `${body.scrollHeight + 16}px`;
            };
            const setOpen = (open: boolean) => {
                isOpen = open;
                button.setText(`${isOpen ? "v" : ">"} ${title}`);
                if (isOpen) {
                    refreshHeight();
                    bodyWrap.style.opacity = "1";
                    bodyWrap.style.transform = "translateY(0)";
                } else {
                    bodyWrap.style.maxHeight = "0px";
                    bodyWrap.style.opacity = "0";
                    bodyWrap.style.transform = "translateY(-4px)";
                }
            };
            button.onclick = () => setOpen(!isOpen);
            setOpen(initiallyOpen);
            return { section, refreshHeight };
        };

        const createComparisonCard = (
            parent: HTMLElement,
            title: string,
            accent: string,
            role: "existing" | "new",
            getCurrentPaths: () => { imagePath: string; notePath: string },
            noteContent: string,
            pairId?: string
        ) => {
            const card = parent.createDiv();
            card.style.flex = "1 1 calc(50% - 8px)";
            card.style.minWidth = "0";
            card.style.border = "1px solid var(--background-modifier-border)";
            card.style.borderTop = `4px solid ${accent}`;
            card.style.borderRadius = "8px";
            card.style.padding = "12px";
            card.style.background = "var(--background-secondary)";

            card.createEl("h3", { text: title });
            const statusWrap = card.createDiv({ cls: "bfm-autotag-duplicate-processing-status-wrap" });
            statusWrap.createSpan({ text: "Status: ", cls: "bfm-autotag-duplicate-processing-status-label" });
            const statusEl = statusWrap.createSpan({ cls: "bfm-autotag-duplicate-processing-status" });
            const initialPaths = getCurrentPaths();
            this.renderComparisonProcessingStatus(statusEl, initialPaths.imagePath, initialPaths.notePath, role);

            const imageWrap = card.createDiv();
            imageWrap.style.display = "flex";
            imageWrap.style.justifyContent = "center";
            imageWrap.style.alignItems = "center";
            imageWrap.style.minHeight = "180px";
            imageWrap.style.background = "var(--background-primary)";
            imageWrap.style.borderRadius = "6px";
            imageWrap.style.border = "1px solid var(--background-modifier-border)";
            let renderedImagePath = "";
            const renderImagePreview = (currentImagePath: string) => {
                if (renderedImagePath === currentImagePath) return;
                renderedImagePath = currentImagePath;
                imageWrap.empty();
                const currentImageFile = this.plugin.app.vault.getAbstractFileByPath(currentImagePath);
                if (!(currentImageFile instanceof TFile)) {
                    const missing = imageWrap.createDiv({ text: "Image file not found." });
                    missing.style.padding = "12px";
                    missing.style.borderRadius = "6px";
                    missing.style.background = "var(--background-primary)";
                    missing.style.color = "var(--text-muted)";
                    return;
                }
                const img = imageWrap.createEl("img", { attr: { src: this.plugin.app.vault.getResourcePath(currentImageFile), alt: currentImagePath } });
                img.style.maxWidth = "180px";
                img.style.maxHeight = "170px";
                img.style.objectFit = "contain";
            };
            renderImagePreview(initialPaths.imagePath);

            let imagePathSpan: HTMLSpanElement | null = null;
            let notePathSpan: HTMLSpanElement | null = null;
            let companionStatusSpan: HTMLSpanElement | null = null;
            let pairIdSpan: HTMLSpanElement | null = null;
            const metadataSection = createAnimatedSection(card, "Image and companion metadata", body => {
                imagePathSpan = createMetaLine(body, "Image", initialPaths.imagePath);
                notePathSpan = createMetaLine(body, "Companion", initialPaths.notePath);
                const initialNote = this.plugin.app.vault.getAbstractFileByPath(initialPaths.notePath);
                companionStatusSpan = createMetaLine(body, "Companion status", initialNote instanceof TFile ? "exists" : "missing or not created yet");
                pairIdSpan = createMetaLine(body, "Pair ID", pairId ?? "not recorded yet");
            });

            let lastNoteContent = noteContent;
            let notePreviewEl: HTMLPreElement | null = null;
            const noteDetailsSection = createAnimatedSection(card, "Companion note details", body => {
                const pre = body.createEl("pre", { text: getNoteSummary(noteContent) });
                notePreviewEl = pre;
                pre.style.maxHeight = "220px";
                pre.style.overflow = "auto";
                pre.style.whiteSpace = "pre-wrap";
                pre.style.padding = "8px";
                pre.style.borderRadius = "6px";
                pre.style.background = "var(--background-primary)";
                pre.style.border = "1px solid var(--background-modifier-border)";
            });

            this.liveRefreshers.push(async () => {
                const currentPaths = getCurrentPaths();
                renderImagePreview(currentPaths.imagePath);
                this.renderComparisonProcessingStatus(statusEl, currentPaths.imagePath, currentPaths.notePath, role);
                const refreshedNote = this.plugin.app.vault.getAbstractFileByPath(currentPaths.notePath);
                if (imagePathSpan) imagePathSpan.setText(currentPaths.imagePath);
                if (notePathSpan) notePathSpan.setText(currentPaths.notePath);
                if (companionStatusSpan) {
                    companionStatusSpan.setText(refreshedNote instanceof TFile ? "exists" : "missing or not created yet");
                }
                if (pairIdSpan) {
                    const refreshedPair = this.plugin.getPairRecordForImagePath(currentPaths.imagePath) ?? this.plugin.getPairRecordForNotePath(currentPaths.notePath);
                    pairIdSpan.setText(refreshedPair?.pairId ?? "not recorded yet");
                }
                window.requestAnimationFrame(() => metadataSection.refreshHeight());
                if (refreshedNote instanceof TFile && notePreviewEl) {
                    const refreshedContent = await this.plugin.getCompanionNoteContent(currentPaths.notePath);
                    if (refreshedContent !== lastNoteContent) {
                        lastNoteContent = refreshedContent;
                        notePreviewEl.setText(getNoteSummary(refreshedContent));
                        window.requestAnimationFrame(() => noteDetailsSection.refreshHeight());
                    }
                }
            });
        };

        const previewRow = contentEl.createDiv();
        previewRow.style.display = "flex";
        previewRow.style.gap = "12px";
        previewRow.style.alignItems = "stretch";
        previewRow.style.flexWrap = "wrap";
        previewRow.style.margin = "12px 0";

        createComparisonCard(
            previewRow,
            "Existing Processed File",
            "#f08c00",
            "existing",
            () => this.getExistingDuplicateLivePaths(),
            existingNoteContent,
            existingPair?.pairId
        );
        createComparisonCard(
            previewRow,
            "New Duplicate File",
            "#2f9e44",
            "new",
            () => this.getNewDuplicateLivePaths(),
            newNoteContent,
            newPair?.pairId
        );
        this.startLiveRefresh();

        const diagnosticsBlock = contentEl.createDiv();
        diagnosticsBlock.style.border = "1px solid var(--background-modifier-border)";
        diagnosticsBlock.style.borderLeft = "4px solid #868e96";
        diagnosticsBlock.style.borderRadius = "8px";
        diagnosticsBlock.style.padding = "10px 12px";
        diagnosticsBlock.style.background = "var(--background-secondary)";
        diagnosticsBlock.style.marginTop = "12px";
        const diagnosticText = [
            `Match type: ${this.match.type}`,
            `Similarity: ${this.match.similarity ?? "n/a"}`,
            `Distance: ${this.match.distance ?? "n/a"}`,
            `Exact hash: ${this.match.record.exactHash.slice(0, 16)}...`,
            `Visual hash: ${this.match.record.visualHash ? `${this.match.record.visualHash.slice(0, 16)}...` : "none"}`,
            `Existing processed: ${new Date(this.match.record.processedAt).toLocaleString()}`,
        ].join("\n");
        createAnimatedSection(diagnosticsBlock, "Duplicate diagnostics", body => {
            const diagnosticPre = body.createEl("pre", { text: diagnosticText });
            diagnosticPre.style.whiteSpace = "pre-wrap";
            diagnosticPre.style.padding = "8px";
            diagnosticPre.style.borderRadius = "6px";
            diagnosticPre.style.background = "var(--background-primary)";
        });

        let migrateLinks = this.plugin.settings.duplicateMigrateLinksOnReplace;
        let autorename = this.plugin.settings.duplicateAutorenameOnReplace;
        const toggleRow = contentEl.createDiv();
        toggleRow.style.display = "grid";
        toggleRow.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
        toggleRow.style.gap = "8px";
        toggleRow.style.marginTop = "10px";
        const createTogglePanel = (title: string, tooltip: string, value: boolean, onChange: (value: boolean) => void) => {
            const panel = toggleRow.createDiv({ attr: { title: tooltip } });
            panel.style.border = "1px solid var(--background-modifier-border)";
            panel.style.borderRadius = "8px";
            panel.style.padding = "10px";
            panel.style.background = "var(--background-secondary)";
            panel.style.display = "flex";
            panel.style.alignItems = "center";
            panel.style.justifyContent = "space-between";
            panel.style.gap = "10px";
            const labelWrap = panel.createDiv();
            labelWrap.style.display = "flex";
            labelWrap.style.alignItems = "center";
            const label = labelWrap.createEl("strong", { text: title });
            label.style.fontSize = "13px";
            createInfoIcon(labelWrap, tooltip);
            new Setting(panel)
                .setName("")
                .addToggle(toggle => toggle
                    .setValue(value)
                    .onChange(onChange));
            const settingEl = panel.querySelector(".setting-item") as HTMLElement | null;
            if (settingEl) {
                settingEl.style.borderTop = "none";
                settingEl.style.padding = "0";
                settingEl.style.margin = "0";
            }
        };
        createTogglePanel(
            "Migrate old links",
            "For replace actions, rewrite markdown wiki links from removed image/note paths to the paths that stay.",
            migrateLinks,
            value => { migrateLinks = value; }
        );
        createTogglePanel(
            "Autorename after replace",
            "Duplicates may have a 1 (same image same folder) or CONFLICT (same image other folder) in back or front. These will also be detected. Autorenaming them is encouraged.",
            autorename,
            value => { autorename = value; }
        );

        const choose = (action: DuplicateAction) => {
            this.resolveDuplicateDecision({ action, migrateLinks, autorename });
        };

        const actionRow = contentEl.createDiv();
        actionRow.style.display = "grid";
        actionRow.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
        actionRow.style.gap = "8px";
        actionRow.style.marginTop = "12px";
        const makeActionButton = (label: string, background: string, color: string, action: DuplicateAction) => {
            const button = actionRow.createEl("button", { text: label });
            button.type = "button";
            button.style.border = "none";
            button.style.borderRadius = "6px";
            button.style.padding = "8px 10px";
            button.style.background = background;
            button.style.color = color;
            button.style.cursor = "pointer";
            button.onclick = () => choose(action);
        };
        makeActionButton("Replace + new location", "#2f9e44", "white", "replace-original-keep-new");
        makeActionButton("Replace + original path", "#d3f9d8", "#1b4332", "replace-original-keep-original");
        makeActionButton("Process anyway", "#f08c00", "#1f1300", "process");
        makeActionButton("Delete pair", "#9b1c1c", "white", "delete-new-pair");
    }

    onClose(): void {
        this.stopLiveRefresh();
        this.contentEl.empty();
        if (!this.decisionMade) {
            new Notice("Choose a duplicate action before Maru\'s Autotag can continue.");
            window.setTimeout(() => this.open(), 50);
        }
    }
}
class ConfirmForgetAllProcessedFilesModal extends Modal {
    constructor(
        app: App,
        private readonly processedCount: number,
        private readonly onConfirm: () => void | Promise<void>
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "Forget all processed files?" });
        contentEl.createEl("p", {
            text: `This clears ${this.processedCount} processed file${this.processedCount === 1 ? "" : "s"}, creates a summary note with image and companion-note links, and queues existing files for reprocessing.`,
        });
        contentEl.createEl("p", {
            text: "Shutdown Protection entries created by this action are marked as Forget All reprocessing, so restart notices can distinguish them from ordinary shutdown recovery.",
        });

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText("Cancel")
                .onClick(() => this.close()))
            .addButton(button => button
                .setButtonText("Forget All")
                .setWarning()
                .onClick(async () => {
                    await this.onConfirm();
                    this.close();
                }));
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
class ConfirmDeleteFolderPropertyMappingModal extends Modal {
    constructor(
        app: App,
        private readonly propertyName: string,
        private readonly onConfirm: () => void | Promise<void>
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "Delete property list?" });
        contentEl.createEl("p", {
            text: `This removes the '${this.propertyName}' folder mapping from Maru\'s Autotag settings. Existing generated notes are not changed.`,
        });

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText("Cancel")
                .onClick(() => this.close()))
            .addButton(button => button
                .setButtonText("Delete")
                .setWarning()
                .onClick(async () => {
                    await this.onConfirm();
                    this.close();
                }));
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

class ConfirmDestructiveActionModal extends Modal {
    constructor(
        app: App,
        private readonly title: string,
        private readonly body: string,
        private readonly confirmText: string,
        private readonly onConfirm: () => void | Promise<void>
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: this.title });
        contentEl.createEl("p", { text: this.body });

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText("Cancel")
                .onClick(() => this.close()))
            .addButton(button => button
                .setButtonText(this.confirmText)
                .setWarning()
                .onClick(async () => {
                    await this.onConfirm();
                    this.close();
                }));
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

class LimitedFileTypeWarningModal extends Modal {
    constructor(
        app: App,
        private readonly plugin: BfmAutotagPlugin,
        private readonly warning: LimitedFileTypeWarningDefinition,
        private readonly file: TFile,
        private readonly onClosed: () => void
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: `Limited file type: .${this.warning.extension}` });
        contentEl.createEl("p", {
            text: `${this.warning.label} files may not be processed completely. Autotag will still try to create a companion note, exact hash, and AI metadata for this file.`,
        });
        contentEl.createEl("p", {
            text: this.warning.description,
        });
        contentEl.createEl("p", {
            text: `File: ${this.file.path}`,
            cls: "setting-item-description",
        });

        new Setting(contentEl)
            .setName(`Skip this popup for .${this.warning.extension}`)
            .setDesc("Turns on the matching Quality of Life setting for this file type.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.isLimitedFileTypeWarningSkipped(this.warning.extension))
                .onChange(async value => {
                    await this.plugin.setLimitedFileTypeWarningSkipped(this.warning.extension, value);
                }));

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText("Ok")
                .setCta()
                .onClick(() => this.close()));
    }

    onClose(): void {
        this.onClosed();
        this.contentEl.empty();
    }
}

class ManualPairConfirmationModal extends Modal {
    private resolved = false;

    constructor(
        app: App,
        private readonly plugin: BfmAutotagPlugin,
        private readonly image: TFile,
        private readonly note: TFile,
        private readonly willQueue: boolean,
        private readonly resolvePairing: (confirmed: boolean) => void
    ) {
        super(app);
    }

    private resolve(confirmed: boolean): void {
        if (this.resolved) return;
        this.resolved = true;
        this.resolvePairing(confirmed);
    }

    private createMetaLine(parent: HTMLElement, label: string, value: string): void {
        const row = parent.createDiv({ cls: "bfm-autotag-manual-pair-meta-line" });
        row.createEl("strong", { text: `${label}: ` });
        row.createSpan({ text: value });
    }

    async onOpen(): Promise<void> {
        const { contentEl, modalEl } = this;
        contentEl.empty();
        modalEl.style.width = "min(900px, 94vw)";
        modalEl.style.maxWidth = "94vw";

        const imagePair = this.plugin.getPairRecordForPath(this.image.path);
        const notePair = this.plugin.getPairRecordForPath(this.note.path);
        const expectedNotePath = this.plugin.getBfmNotePath(this.image);
        const noteContent = await this.plugin.getCompanionNoteContent(this.note.path);

        contentEl.createEl("h2", { text: "Confirm Manual Pairing" });
        contentEl.createEl("p", {
            text: this.willQueue
                ? "One of these files is currently queued or processing. If confirmed, Autotag will update the pair after processing finishes."
                : "Review the image and companion note before updating Autotag's pair database.",
            cls: "setting-item-description",
        });

        const previewRow = contentEl.createDiv({ cls: "bfm-autotag-manual-pair-preview-row" });

        const imageCard = previewRow.createDiv({ cls: "bfm-autotag-manual-pair-card bfm-autotag-manual-pair-card-source" });
        imageCard.createEl("h3", { text: "Image / Source File" });
        const imageWrap = imageCard.createDiv({ cls: "bfm-autotag-manual-pair-image-wrap" });
        const imageEl = imageWrap.createEl("img", {
            attr: {
                src: this.app.vault.getResourcePath(this.image),
                alt: this.image.path,
            },
        });
        const imageFallbackEl = imageWrap.createDiv({
            text: "Preview unavailable for this file type.",
            cls: "bfm-autotag-manual-pair-preview-fallback",
        });
        imageFallbackEl.hide();
        imageEl.onerror = () => {
            imageEl.hide();
            imageFallbackEl.show();
        };
        this.createMetaLine(imageCard, "Path", this.image.path);
        this.createMetaLine(imageCard, "Extension", this.image.extension || "unknown");
        this.createMetaLine(imageCard, "Current Pair ID", imagePair?.pairId ?? "unpaired");
        this.createMetaLine(imageCard, "Expected companion", expectedNotePath);

        const noteCard = previewRow.createDiv({ cls: "bfm-autotag-manual-pair-card bfm-autotag-manual-pair-card-note" });
        noteCard.createEl("h3", { text: "Companion Note" });
        this.createMetaLine(noteCard, "Path", this.note.path);
        this.createMetaLine(noteCard, "Current Pair ID", notePair?.pairId ?? "unpaired");
        this.createMetaLine(noteCard, "Matches expected path", this.note.path === expectedNotePath ? "yes" : "no");
        if (imagePair?.pairId && notePair?.pairId && imagePair.pairId !== notePair.pairId) {
            const warningEl = noteCard.createDiv({
                text: "Both files already belong to different pairs. Confirming will unpair their old partners and create one pair for these two files.",
                cls: "bfm-autotag-manual-pair-warning",
            });
            warningEl.setAttr("aria-label", "Pairing warning");
        }
        const notePreviewEl = noteCard.createEl("pre", {
            text: noteContent.trim()
                ? noteContent.slice(0, 1600) + (noteContent.length > 1600 ? "\n..." : "")
                : "Companion note is empty.",
            cls: "bfm-autotag-manual-pair-note-preview",
        });
        notePreviewEl.setAttr("aria-label", "Companion note preview");

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText("Cancel")
                .onClick(() => {
                    this.resolve(false);
                    this.close();
                }))
            .addButton(button => button
                .setButtonText(this.willQueue ? "Confirm and Queue Pair" : "Confirm Pair")
                .setCta()
                .onClick(() => {
                    this.resolve(true);
                    this.close();
                }));
    }

    onClose(): void {
        this.resolve(false);
        this.contentEl.empty();
    }
}

class BfmAutotagSettingTab extends PluginSettingTab {
    plugin: BfmAutotagPlugin;
    recentlyAddedPanelKeys = new Set<string>();
    infoScrollCloseHandlers: { target: EventTarget; handler: EventListener }[] = [];

    constructor(app: App, plugin: BfmAutotagPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    getRecentlyAddedKey(scope: string, id: string): string {
        return `${scope}:${id.trim().toLowerCase()}`;
    }

    markRecentlyAddedPanel(scope: string, id: string): void {
        const key = this.getRecentlyAddedKey(scope, id);
        this.recentlyAddedPanelKeys.add(key);
        window.setTimeout(() => {
            this.recentlyAddedPanelKeys.delete(key);
        }, 2400);
    }

    applyRecentlyAddedPanelHighlight(el: HTMLElement, scope: string, id: string): void {
        if (this.recentlyAddedPanelKeys.has(this.getRecentlyAddedKey(scope, id))) {
            el.addClass("bfm-autotag-newly-added-panel");
        }
    }

    closeInfoDescriptions(containerEl: HTMLElement = this.containerEl): void {
        const controllers = Array.from(containerEl.querySelectorAll(".setting-item"))
            .map(el => (el as any).__bfmAutotagInfoController)
            .filter(Boolean);
        controllers.forEach(controller => controller.close());
    }

    resetInfoScrollCloseHandlers(): void {
        this.infoScrollCloseHandlers.forEach(({ target, handler }) => target.removeEventListener("scroll", handler));
        this.infoScrollCloseHandlers = [];
    }

    registerInfoCloseGuards(containerEl: HTMLElement): void {
        if ((containerEl as any).__bfmAutotagInfoCloseGuardsAttached) return;
        (containerEl as any).__bfmAutotagInfoCloseGuardsAttached = true;
        containerEl.addEventListener("mouseleave", () => this.closeInfoDescriptions(containerEl));

        const scrollTargets = new Set<EventTarget>([window]);
        let parent = containerEl.parentElement;
        while (parent) {
            const style = window.getComputedStyle(parent);
            if (/(auto|scroll|overlay)/.test(`${style.overflow}${style.overflowY}${style.overflowX}`)) {
                scrollTargets.add(parent);
            }
            parent = parent.parentElement;
        }
        const handler: EventListener = () => this.closeInfoDescriptions(containerEl);
        scrollTargets.forEach(target => {
            target.addEventListener("scroll", handler, { passive: true });
            this.infoScrollCloseHandlers.push({ target, handler });
        });
    }

    attachTextSuggestions(inputEl: HTMLInputElement, suggestions: string[]): void {
        const uniqueSuggestions = Array.from(new Set(suggestions.map(item => item.trim()).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b));
        if (uniqueSuggestions.length === 0) return;
        const listId = `bfm-autotag-suggestions-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const listEl = document.createElement("datalist");
        listEl.id = listId;
        const refreshSuggestions = () => {
            const query = inputEl.value.trim().toLowerCase().replace(/\\/g, "/");
            listEl.empty();
            if (!query) return;
            uniqueSuggestions
                .filter(suggestion => suggestion.toLowerCase().replace(/\\/g, "/").includes(query))
                .slice(0, 50)
                .forEach(suggestion => {
                    const optionEl = document.createElement("option");
                    optionEl.value = suggestion;
                    listEl.appendChild(optionEl);
                });
        };
        inputEl.setAttribute("list", listId);
        inputEl.addEventListener("input", refreshSuggestions);
        refreshSuggestions();
        inputEl.parentElement?.appendChild(listEl);
    }

    getFolderPathSuggestions(): string[] {
        return this.app.vault.getAllLoadedFiles()
            .filter(file => file instanceof TFolder && file.path.trim().length > 0)
            .map(folder => folder.path);
    }
    getPathSuggestionRelativeToRoot(path: string, root: string): string {
        const normalizedPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
        const normalizedRoot = root.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        if (!normalizedRoot) return normalizedPath;
        if (normalizedPath === normalizedRoot) return normalizedPath.split("/").pop() ?? normalizedPath;
        if (normalizedPath.startsWith(`${normalizedRoot}/`)) {
            return normalizedPath.slice(normalizedRoot.length + 1);
        }
        return normalizedPath;
    }

    getAllFrontmatterProperties(): string[] {
        const properties = new Set<string>();
        this.app.vault.getMarkdownFiles().forEach(file => {
            const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
            if (!frontmatter) return;
            Object.keys(frontmatter).forEach(property => {
                const trimmed = property.trim();
                if (trimmed) properties.add(trimmed);
            });
        });
        return Array.from(properties).sort((a, b) => a.localeCompare(b));
    }

    getPropertyNameSuggestions(detectedProperties: string[] = this.getDetectedFrontmatterProperties()): string[] {
        return Array.from(new Set([
            ...detectedProperties,
            ...this.getAllFrontmatterProperties(),
            ...this.plugin.getGeolocationPropertyNames(),
            this.plugin.settings.folderFallbackProperty,
            DEFAULT_SETTINGS.folderFallbackProperty,
            DEFAULT_SETTINGS.linkToFilePropertyName,
            DEFAULT_SETTINGS.fileTypePropertyName,
            DEFAULT_SETTINGS.embedPropertyName,
            DEFAULT_SETTINGS.aiTagsPropertyName,
            DEFAULT_SETTINGS.aiDescriptionPropertyName,
            this.plugin.getVaultAwarenessOutputPropertyName(),
            DEFAULT_SETTINGS.vaultAwarenessOutputPropertyName,
        ])).filter(Boolean).sort((a, b) => a.localeCompare(b));
    }

    getDetectedFrontmatterProperties(): string[] {
        const normalizeKey = (property: string) => property.trim().toLowerCase();
        const managedProperties = new Set([
            "position",
            "linktofile",
            "filetype",
            "embed",
            "lastModified",
            "created",
            "aitags",
            "aidescription",
            this.plugin.getLinkToFilePropertyName(),
            this.plugin.getFileTypePropertyName(),
            this.plugin.getEmbedPropertyName(),
            this.plugin.getAiTagsPropertyName(),
            this.plugin.getAiDescriptionPropertyName(),
            this.plugin.getVaultAwarenessOutputPropertyName(),
            ...this.plugin.getGeolocationPropertyNames(),
        ].map(normalizeKey));
        const extraExcludedProperties = new Set(this.plugin.settings.clearDropdownExcludedProperties.map(normalizeKey));
        const properties = new Set<string>([
            "domains",
            "types",
            "related",
            "currentStatus",
            "tags",
        ]);

        this.app.vault.getMarkdownFiles().forEach(file => {
            const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
            if (!frontmatter) return;

            Object.keys(frontmatter).forEach(property => {
                const trimmedProperty = property.trim();
                if (!trimmedProperty) return;
                const key = normalizeKey(trimmedProperty);
                if (managedProperties.has(key) || extraExcludedProperties.has(key)) return;
                properties.add(trimmedProperty);
            });
        });

        return Array.from(properties).sort((a, b) => a.localeCompare(b));
    }

    renderClearDropdownExcludedProperties(containerEl: HTMLElement): void {
        const clearDropdownPanelEl = containerEl.createDiv({ cls: "bfm-autotag-property-panel" });
        clearDropdownPanelEl.createEl("h5", { text: "Clear Dropdown" });
        clearDropdownPanelEl.createEl("p", {
            text: "Autotag-managed properties are hidden automatically. Add extra properties here to hide noisy fields from this plugin's property dropdowns.",
            cls: "setting-item-description",
        });
        this.plugin.settings.clearDropdownExcludedProperties.forEach(property => {
            const excludedPropertySetting = new Setting(clearDropdownPanelEl)
                .setName(property)
                .setDesc("Hidden from property dropdowns in this plugin.")
                .addButton(button => button
                    .setIcon("trash")
                    .setTooltip("Remove excluded property")
                    .onClick(async () => {
                        this.plugin.settings.clearDropdownExcludedProperties = this.plugin.settings.clearDropdownExcludedProperties.filter(candidate => candidate !== property);
                        await this.plugin.saveSettings();
                        this.refreshDisplayAnimated();
                    }));
            this.applyRecentlyAddedPanelHighlight(excludedPropertySetting.settingEl, "clear-dropdown-property", property);
        });
        let pendingExcludedProperty = "";
        new Setting(clearDropdownPanelEl)
            .setName("Add excluded property")
            .setDesc("Example: excalidraw-plugin or excalidraw-open-md.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getAllFrontmatterProperties());
                text.setPlaceholder("property-name")
                .onChange(value => {
                    pendingExcludedProperty = value;
                });
            })
            .addButton(button => button
                .setButtonText("Add Property")
                .setCta()
                .onClick(async () => {
                    const property = this.plugin.normalizePropertyName(pendingExcludedProperty, "");
                    if (!property || this.plugin.settings.clearDropdownExcludedProperties.includes(property)) return;
                    this.markRecentlyAddedPanel("clear-dropdown-property", property);
                    this.plugin.settings.clearDropdownExcludedProperties = [...this.plugin.settings.clearDropdownExcludedProperties, property]
                        .sort((a, b) => a.localeCompare(b));
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));

    }

    renderLimitedFileTypeWarningSettings(containerEl: HTMLElement): void {
        const warningPanelEl = containerEl.createDiv({ cls: "bfm-autotag-property-panel" });
        warningPanelEl.createEl("h5", { text: "Limited File Type Warnings" });
        warningPanelEl.createEl("p", {
            text: "Some image-like formats can be stored and exact-hashed, but AI analysis, visual duplicate previews, or metadata extraction may depend on external support.",
            cls: "setting-item-description",
        });

        new Setting(warningPanelEl)
            .setName("Hide limited file type warning controls")
            .setDesc("Keeps per-extension popup controls collapsed. Saved warning choices still apply.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hideLimitedFileTypeWarnings)
                .onChange(async value => {
                    this.plugin.settings.hideLimitedFileTypeWarnings = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        this.animateSettingsCollapseThenRender(warningControlsHostEl, renderWarningControls);
                    } else {
                        this.animateSettingsContent(warningControlsHostEl, renderWarningControls);
                    }
                }));

        const warningControlsHostEl = warningPanelEl.createDiv();
        const renderWarningControls = () => {
            warningControlsHostEl.empty();
            if (this.plugin.settings.hideLimitedFileTypeWarnings) return;
            const controlsEl = this.createSettingsRevealContainer(warningControlsHostEl, "bfm-autotag-subcategory");
            LIMITED_FILE_TYPE_WARNINGS.forEach(definition => {
                new Setting(controlsEl)
                    .setName(`Skip .${definition.extension} popup`)
                    .setDesc(`${definition.description} Off means Autotag warns when this file type is added; On skips future popups for this extension.`)
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.isLimitedFileTypeWarningSkipped(definition.extension))
                        .onChange(async value => {
                            await this.plugin.setLimitedFileTypeWarningSkipped(definition.extension, value);
                        }));
            });
        };
        renderWarningControls();
        if (!this.plugin.settings.hideLimitedFileTypeWarnings) this.forceSettingsBodyOpen(warningControlsHostEl);
    }

    renderFolderPropertyLists(containerEl: HTMLElement, detectedProperties: string[]): void {
        containerEl.createEl("h4", { text: "Folder Properties" });
        containerEl.createEl("p", {
            text: "Map folder names to frontmatter properties. If the same folder name appears in more than one list, it is written to every matching property.",
            cls: "setting-item-description",
        });

        const listHostEl = containerEl.createDiv();
        const renderList = () => this.renderFolderPropertyListItems(listHostEl, detectedProperties, renderList);
        renderList();
    }

    renderFolderPropertyListItems(containerEl: HTMLElement, detectedProperties: string[], rerender: () => void): void {
        containerEl.empty();
        const mappings = this.plugin.settings.folderPropertyMappings;
        mappings.forEach((mapping, index) => {
            const propertyPanelEl = containerEl.createDiv({ cls: "bfm-autotag-property-panel" });
            this.applyRecentlyAddedPanelHighlight(propertyPanelEl, "folder-property", mapping.id);
            propertyPanelEl.createEl("h5", { text: `Folder Property ${index + 1}` });
            const setting = new Setting(propertyPanelEl)
                .setName("Property")
                .setDesc("Choose the property, enter matching folder names, and optionally format written values with example as the placeholder.");

            setting.addDropdown(dropdown => {
                const options = new Set([...detectedProperties, mapping.property]);
                Array.from(options)
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b))
                    .forEach(property => dropdown.addOption(property, property));
                dropdown
                    .setValue(mapping.property)
                    .onChange(async value => {
                        mapping.property = this.plugin.normalizeFolderFallbackProperty(value);
                        await this.plugin.saveSettings();
                        if (mapping.useAsVaultCandidate) this.plugin.buildVaultVocabularyCache();
                    });
            });

            setting.addTextArea(textArea => {
                textArea.inputEl.rows = 2;
                textArea
                    .setPlaceholder("comma, separated")
                    .setValue(mapping.values.join(", "))
                    .onChange(async value => {
                        mapping.values = value
                            .split(",")
                            .map(item => item.trim())
                            .filter(Boolean);
                        await this.plugin.saveSettings();
                    });
            });

            setting.addButton(button => button
                .setIcon("trash")
                .setTooltip("Delete property list")
                .onClick(() => {
                    new ConfirmDeleteFolderPropertyMappingModal(
                        this.app,
                        mapping.property || "this property",
                        async () => {
                            this.plugin.settings.folderPropertyMappings = this.plugin.settings.folderPropertyMappings
                                .filter(candidate => candidate.id !== mapping.id);
                            await this.plugin.saveSettings();
                            this.animateSettingsContent(containerEl, rerender);
                        }
                    ).open();
                }));

            const formatSetting = new Setting(propertyPanelEl)
                .setName("Folder Property Format")
                .setDesc("Controls how this property list writes each matched folder value.");
            const previewEl = formatSetting.controlEl.createDiv();
            const refreshPreview = () => {
                this.renderFormatPreview(previewEl, "Preview", mapping.format, "info");
            };
            refreshPreview();
            formatSetting.addText(text => text
                .setPlaceholder("[[example]]")
                .setValue(mapping.format)
                .onChange(async value => {
                    mapping.format = value;
                    refreshPreview();
                    await this.plugin.saveSettings();
                }));

            new Setting(propertyPanelEl)
                .setName("Use as AI candidates")
                .setDesc("Allows values generated by this property list to be used by Folder Tags Candidate Mode.")
                .addToggle(toggle => toggle
                    .setValue(mapping.useAsAiCandidate)
                    .onChange(async value => {
                        mapping.useAsAiCandidate = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(propertyPanelEl)
                .setName("Use as Vault Awareness Candidates")
                .setDesc("Allows values already written in this property to become known vocabulary for Vault Awareness.")
                .addToggle(toggle => toggle
                    .setValue(mapping.useAsVaultCandidate)
                    .onChange(async value => {
                        mapping.useAsVaultCandidate = value;
                        await this.plugin.saveSettings();
                        this.plugin.buildVaultVocabularyCache();
                    }));
        });

        new Setting(containerEl)
            .setName("Add property list")
            .setDesc("Adds another folder-to-property mapping row.")
            .addButton(button => button
                .setButtonText("Add property")
                .setCta()
                .onClick(async () => {
                    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                    this.markRecentlyAddedPanel("folder-property", id);
                    this.plugin.settings.folderPropertyMappings.push({
                        id,
                        property: DEFAULT_SETTINGS.folderFallbackProperty,
                        values: [],
                        format: '',
                        useAsAiCandidate: true,
                        useAsVaultCandidate: true,
                    });
                    await this.plugin.saveSettings();
                    this.animateSettingsContent(containerEl, rerender);
                }));
    }

    addLinguisticFeatureToggles(containerEl: HTMLElement, scope: "bridge" | "vault"): void {
        const settingsKey = scope === "bridge" ? "bridgeLinguisticFeatures" : "vaultLinguisticFeatures";
        const features = this.plugin.settings[settingsKey];

        containerEl.createEl("p", {
            text: "Use actively applies and encourages the feature. Base adds no instruction and leaves interpretation to the model. Exclude actively rejects the feature.",
            cls: "setting-item-description",
        });
        const excludeWarning = containerEl.createEl("p", {
            text: "Warning: Exclude adds negative prompt instructions and may cause unwanted or overly cautious results.",
            cls: "setting-item-description",
        });
        const refreshExcludeWarning = () => {
            excludeWarning.style.display = Object.values(features).some(mode => mode === "exclude") ? "" : "none";
        };
        refreshExcludeWarning();

        LINGUISTIC_FEATURE_OPTIONS.forEach(option => {
            let broaderWarning: HTMLElement | null = null;
            new Setting(containerEl)
                .setName(option.name)
                .setDesc(option.description)
                .addDropdown(dropdown => dropdown
                    .addOption("exclude", "Exclude")
                    .addOption("base", "Base")
                    .addOption("use", "Use")
                    .setValue(features[option.key])
                    .onChange(async value => {
                        features[option.key] = value as LinguisticFeatureMode;
                        await this.plugin.saveSettings();
                        refreshExcludeWarning();
                        if (broaderWarning) {
                            broaderWarning.style.display = value === "use" ? "" : "none";
                        }
                    }));

            if (option.key === "broaderNarrower") {
                broaderWarning = containerEl.createEl("p", {
                    text: "Warning: When set to Use, broader/narrower matching may become too general depending on how concepts are organized in your vault.",
                    cls: "setting-item-description",
                });
                broaderWarning.style.display = features.broaderNarrower === "use" ? "" : "none";
            }
        });
    }

    renderLinguisticFeatureSubsection(containerEl: HTMLElement, scope: "bridge" | "vault"): void {
        containerEl.empty();
        const hidden = scope === "bridge"
            ? this.plugin.settings.hideBridgeLinguisticFeatures
            : this.plugin.settings.hideVaultLinguisticFeatures;
        if (hidden) return;
        const bodyEl = this.createSettingsRevealContainer(containerEl, "bfm-autotag-subcategory");
        this.addLinguisticFeatureToggles(bodyEl, scope);
    }

    createSettingsRevealContainer(containerEl: HTMLElement, extraClass = ""): HTMLElement {
        const classes = ["bfm-autotag-animated-section-body", "is-open", ...extraClass.split(/\s+/).filter(Boolean)];
        return containerEl.createDiv({ cls: classes.join(" ") });
    }

    createSettingsSubcategory(containerEl: HTMLElement): HTMLElement {
        return containerEl.createDiv();
    }
    renderFormatPreview(containerEl: HTMLElement, label: string, format: string | undefined, hintMode: "visible" | "info" = "visible"): void {
        containerEl.empty();
        const hintText = "Use example, Example, or EXAMPLE to control casing; empty writes plain values.";
        const previewEl = containerEl.createDiv({ cls: "bfm-autotag-format-preview" });
        previewEl.createEl("span", { text: `${label}: `, cls: "bfm-autotag-format-preview-label" });
        if (hintMode === "info") {
            const infoWrap = previewEl.createSpan({ cls: "bfm-autotag-format-preview-info-wrap" });
            infoWrap.createSpan({ cls: "bfm-autotag-info-trigger", text: "i" });
            infoWrap.createSpan({ cls: "bfm-autotag-format-preview-info", text: hintText });
        }
        const markdownEl = previewEl.createDiv({ cls: "bfm-autotag-format-preview-markdown" });
        void MarkdownRenderer.render(this.app, this.plugin.getFormatPreview(format), markdownEl, "", this.plugin);
        if (hintMode === "visible") {
            containerEl.createDiv({
                text: hintText,
                cls: "bfm-autotag-format-preview-hint",
            });
        }
    }

    getTemplatePropertySuggestionRefs(containerEl: HTMLElement): TemplatePropertySuggestionRefs {
        const existing = (containerEl as any).__bfmAutotagTemplatePropertySuggestion as TemplatePropertySuggestionRefs | undefined;
        if (existing) return existing;

        containerEl.empty();
        const panelEl = containerEl.createDiv({ cls: "bfm-autotag-frontmatter-check-panel is-clean bfm-autotag-template-suggestion-panel" });
        const infoSettingEl = panelEl.createDiv({ cls: "setting-item bfm-autotag-frontmatter-check-info-setting" });
        const infoBodyEl = infoSettingEl.createDiv({ cls: "setting-item-info" });
        const nameEl = infoBodyEl.createDiv({ cls: "setting-item-name" });
        const titleTextEl = nameEl.createSpan();
        infoBodyEl.createDiv({
            text: "These are active Autotag output properties that can be placed in the selected template source. If you leave them undeclared, Autotag can still add them later.",
            cls: "setting-item-description",
        });
        const listEl = panelEl.createEl("ul", { cls: "bfm-autotag-frontmatter-check-list" });
        const cleanTextEl = panelEl.createEl("p", {
            cls: "setting-item-description bfm-autotag-frontmatter-check-clean-text",
        });
        this.enhanceInfoDescriptionAnimations(panelEl);

        const refs: TemplatePropertySuggestionRefs = {
            panelEl,
            titleTextEl,
            listEl,
            cleanTextEl,
        };
        (containerEl as any).__bfmAutotagTemplatePropertySuggestion = refs;
        return refs;
    }

    renderTemplatePropertySuggestionBox(containerEl: HTMLElement, animate = false): void {
        const refs = this.getTemplatePropertySuggestionRefs(containerEl);
        const missingProperties = this.plugin.getMissingTemplateDeclarationProperties();
        const hasMissingProperties = missingProperties.length > 0;
        const updatePanel = () => {
            refs.panelEl.toggleClass("has-unfilled", hasMissingProperties);
            refs.panelEl.toggleClass("is-clean", !hasMissingProperties);
            refs.titleTextEl.setText(hasMissingProperties
                ? "Available properties not declared in this template:"
                : "All active output properties are declared.");
            refs.listEl.empty();
            refs.listEl.style.display = hasMissingProperties ? "" : "none";
            refs.cleanTextEl.style.display = hasMissingProperties ? "none" : "";
            refs.cleanTextEl.setText("The selected template source already includes every active Autotag output property.");
            missingProperties.forEach(property => refs.listEl.createEl("li", { text: `${property}:` }));
        };

        if (animate) {
            this.animateElementHeightChange(refs.panelEl, updatePanel, 360);
        } else {
            updatePanel();
        }
    }

    getGeneratedMarkdownPreviewRefs(containerEl: HTMLElement): GeneratedMarkdownPreviewRefs {
        const existing = (containerEl as any).__bfmAutotagGeneratedMarkdownPreview as GeneratedMarkdownPreviewRefs | undefined;
        if (existing) return existing;

        containerEl.empty();
        const checkPanelEl = containerEl.createDiv({ cls: "bfm-autotag-frontmatter-check-panel is-clean" });
        const infoSettingEl = checkPanelEl.createDiv({ cls: "setting-item bfm-autotag-frontmatter-check-info-setting" });
        const infoBodyEl = infoSettingEl.createDiv({ cls: "setting-item-info" });
        const nameEl = infoBodyEl.createDiv({ cls: "setting-item-name" });
        const titleTextEl = nameEl.createSpan();
        infoBodyEl.createDiv({
            text: "Reasons may be: Spelling, or your intended purpose.",
            cls: "setting-item-description",
        });
        const listEl = checkPanelEl.createEl("ul", { cls: "bfm-autotag-frontmatter-check-list" });
        const cleanTextEl = checkPanelEl.createEl("p", {
            cls: "setting-item-description bfm-autotag-frontmatter-check-clean-text",
        });
        this.enhanceInfoDescriptionAnimations(checkPanelEl);

        const previewPanelEl = containerEl.createDiv({ cls: "bfm-autotag-property-panel bfm-autotag-markdown-note-preview-panel" });
        previewPanelEl.createEl("h5", { text: "Generated Markdown Preview" });
        previewPanelEl.createEl("p", {
            text: "Raw preview of the companion note after Autotag has applied the selected template source, generated properties, folder properties, geolocation properties, and note body setting.",
            cls: "setting-item-description",
        });
        const preEl = previewPanelEl.createEl("pre", { cls: "bfm-autotag-markdown-note-preview" });
        const codeEl = preEl.createEl("code");

        const refs: GeneratedMarkdownPreviewRefs = {
            checkPanelEl,
            titleTextEl,
            listEl,
            cleanTextEl,
            previewPanelEl,
            codeEl,
        };
        (containerEl as any).__bfmAutotagGeneratedMarkdownPreview = refs;
        return refs;
    }

    renderGeneratedMarkdownPreview(containerEl: HTMLElement, animate = false): void {
        const refs = this.getGeneratedMarkdownPreviewRefs(containerEl);
        this.updateGeneratedMarkdownPreview(refs, animate);
    }

    updateGeneratedMarkdownPreview(refs: GeneratedMarkdownPreviewRefs, animate: boolean): void {
        const unfilledProperties = this.plugin.getFrontmatterPreviewTemplateCheck();
        const hasUnfilledProperties = unfilledProperties.length > 0;
        const updateCheckPanel = () => {
            refs.checkPanelEl.toggleClass("has-unfilled", hasUnfilledProperties);
            refs.checkPanelEl.toggleClass("is-clean", !hasUnfilledProperties);
            refs.titleTextEl.setText(hasUnfilledProperties
                ? "The following properties are not recognized:"
                : "Template check looks clean.");
            refs.listEl.empty();
            refs.listEl.style.display = hasUnfilledProperties ? "" : "none";
            refs.cleanTextEl.style.display = hasUnfilledProperties ? "none" : "";
            refs.cleanTextEl.setText("Empty template fields and overwrite placeholders currently match enabled Autotag outputs.");
            unfilledProperties.forEach(property => refs.listEl.createEl("li", { text: property }));
        };

        if (animate) {
            this.animateElementHeightChange(refs.checkPanelEl, updateCheckPanel, 360);
        } else {
            updateCheckPanel();
        }

        const previewText = this.plugin.buildGeneratedMarkdownPreview();
        if (refs.codeEl.textContent !== previewText) {
            refs.codeEl.setText(previewText);
        }
    }

    easeSettingsAnimation(t: number): number {
        return 1 - Math.pow(1 - t, 3);
    }

    tweenSettingsHeight(containerEl: HTMLElement, fromHeight: number, toHeight: number, duration: number, done: () => void): void {
        const start = performance.now();
        const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = this.easeSettingsAnimation(progress);
            const height = fromHeight + (toHeight - fromHeight) * eased;
            containerEl.style.height = `${height}px`;
            if (progress < 1) {
                window.requestAnimationFrame(tick);
            } else {
                done();
            }
        };
        window.requestAnimationFrame(tick);
    }

    prepareSettingsRevealContainersForMeasurement(containerEl: HTMLElement): void {
        const revealEls = Array.from(containerEl.querySelectorAll(".bfm-autotag-animated-section-body")) as HTMLElement[];
        revealEls.forEach(revealEl => {
            revealEl.addClass("is-open");
            revealEl.style.maxHeight = "none";
            revealEl.style.opacity = "1";
            revealEl.style.transform = "translateY(0)";
        });
    }

    finishSettingsLiveRender(containerEl: HTMLElement): void {
        this.wrapSubcategoryPanels(containerEl);
        this.decorateSettingsHeadings(containerEl);
        this.prepareSettingsRevealContainersForMeasurement(containerEl);
        this.enhanceInfoDescriptionAnimations(containerEl);
    }

    measureNaturalSettingsHeight(containerEl: HTMLElement, fallbackHeight: number): number {
        const lockedHeight = containerEl.style.height;
        containerEl.style.height = "auto";
        const measured = containerEl.getBoundingClientRect().height;
        containerEl.style.height = lockedHeight;
        return Number.isFinite(measured) && measured >= 0 ? measured : fallbackHeight;
    }

    animateElementHeightChange(element: HTMLElement, update: () => void, duration: number): void {
        const fromHeight = element.getBoundingClientRect().height;
        const runningFrame = (element as any).__bfmAutotagHeightFrame as number | undefined;
        if (runningFrame !== undefined) window.cancelAnimationFrame(runningFrame);

        element.style.height = `${fromHeight}px`;
        element.style.overflow = "hidden";
        update();

        const toHeight = this.measureNaturalSettingsHeight(element, element.scrollHeight);
        if (Math.abs(toHeight - fromHeight) < 1) {
            element.style.height = "";
            element.style.overflow = "";
            (element as any).__bfmAutotagHeightFrame = undefined;
            return;
        }

        const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        (element as any).__bfmAutotagHeightToken = token;
        const start = performance.now();
        const tick = (now: number) => {
            if ((element as any).__bfmAutotagHeightToken !== token) return;
            const progress = Math.min(1, (now - start) / duration);
            const eased = this.easeSettingsAnimation(progress);
            element.style.height = `${fromHeight + (toHeight - fromHeight) * eased}px`;
            if (progress < 1) {
                (element as any).__bfmAutotagHeightFrame = window.requestAnimationFrame(tick);
                return;
            }
            (element as any).__bfmAutotagHeightFrame = undefined;
            (element as any).__bfmAutotagHeightToken = undefined;
            element.style.height = "";
            element.style.overflow = "";
        };
        (element as any).__bfmAutotagHeightFrame = window.requestAnimationFrame(tick);
    }

    animateSettingsCollapseThenRender(containerEl: HTMLElement, render: () => void): void {
        const previousHeight = containerEl.getBoundingClientRect().height;
        const oldChildren = Array.from(containerEl.children) as HTMLElement[];
        const duration = 520;
        const fadeDuration = 180;
        const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        (containerEl as any).__bfmAutotagContentAnimationToken = token;

        containerEl.style.overflow = "hidden";
        containerEl.style.height = `${previousHeight}px`;
        oldChildren.forEach(child => {
            child.animate(
                [
                    { opacity: 1, transform: "translateY(0)" },
                    { opacity: 0, transform: "translateY(-8px)" },
                ],
                { duration: fadeDuration, easing: "ease", fill: "forwards" }
            );
        });

        this.tweenSettingsHeight(containerEl, previousHeight, 0, duration, () => {
            if ((containerEl as any).__bfmAutotagContentAnimationToken !== token) return;
            render();
            this.finishSettingsLiveRender(containerEl);
            containerEl.style.height = "";
            containerEl.style.overflow = "";
        });
    }

    animateSettingsContent(containerEl: HTMLElement, render: () => void): void {
        const previousHeight = containerEl.getBoundingClientRect().height;
        const duration = 420;
        const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
        const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        (containerEl as any).__bfmAutotagContentAnimationToken = token;

        containerEl.style.overflow = "hidden";
        containerEl.style.height = `${previousHeight}px`;
        render();
        this.finishSettingsLiveRender(containerEl);
        const newChildren = Array.from(containerEl.children) as HTMLElement[];
        newChildren.forEach(child => {
            child.style.opacity = "0";
            child.style.transform = "translateY(6px)";
        });

        const nextHeight = this.measureNaturalSettingsHeight(containerEl, containerEl.scrollHeight);
        this.tweenSettingsHeight(containerEl, previousHeight, nextHeight, duration, () => {
            if ((containerEl as any).__bfmAutotagContentAnimationToken !== token) return;
            const settledHeight = this.measureNaturalSettingsHeight(containerEl, nextHeight);
            containerEl.style.height = `${settledHeight}px`;
            containerEl.style.overflow = "";
            window.setTimeout(() => {
                if ((containerEl as any).__bfmAutotagContentAnimationToken !== token) return;
                const lockedHeight = containerEl.getBoundingClientRect().height;
                const naturalHeight = this.measureNaturalSettingsHeight(containerEl, lockedHeight);
                if (Math.abs(naturalHeight - lockedHeight) < 2) {
                    containerEl.style.height = "";
                    return;
                }
                containerEl.style.overflow = "hidden";
                this.tweenSettingsHeight(containerEl, lockedHeight, naturalHeight, 160, () => {
                    if ((containerEl as any).__bfmAutotagContentAnimationToken !== token) return;
                    containerEl.style.height = "";
                    containerEl.style.overflow = "";
                });
            }, 320);
        });

        window.requestAnimationFrame(() => {
            newChildren.forEach(child => {
                child.animate(
                    [
                        { opacity: 0, transform: "translateY(6px)" },
                        { opacity: 1, transform: "translateY(0)" },
                    ],
                    { duration: 260, easing, fill: "forwards" }
                );
                window.setTimeout(() => {
                    child.style.opacity = "";
                    child.style.transform = "";
                }, 280);
            });
        });
    }

    renderGeolocationSettings(containerEl: HTMLElement): void {
        this.createSettingsAnchor(containerEl, "geolocation", "Geolocation Tags");

        const geolocationHowHostEl = containerEl.createDiv();
        const renderGeolocationHow = () => {
            geolocationHowHostEl.empty();
            if (this.plugin.settings.geolocationEnabled) return;
            this.renderHowItWorksPanel(
                geolocationHowHostEl,
                "How Geolocation Tags work",
                "When enabled, Autotag reads GPS metadata from supported image files and can optionally convert coordinates into place names. Public Nominatim is a shared community service; heavy use may cause delayed, rejected, or temporarily blocked requests. Autotag spaces requests, caches results, and queues delayed lookups automatically."
            );
        };
        renderGeolocationHow();

        new Setting(containerEl)
            .setName("Enable Geolocation Tags")
            .setDesc("Reads GPS coordinates from image metadata when available. If no GPS data exists, no location request is made.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.geolocationEnabled)
                .onChange(async value => {
                    this.plugin.settings.geolocationEnabled = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        this.animateSettingsCollapseThenRender(geolocationHowHostEl, renderGeolocationHow);
                        this.animateSettingsContent(enabledHostEl, renderEnabled);
                    } else {
                        this.animateSettingsContent(geolocationHowHostEl, renderGeolocationHow);
                        this.animateSettingsCollapseThenRender(enabledHostEl, renderEnabled);
                    }
                }));

        const enabledHostEl = containerEl.createDiv();
        const renderEnabled = () => this.renderGeolocationEnabledSettings(enabledHostEl, renderEnabled);
        renderEnabled();
        if (this.plugin.settings.geolocationEnabled) this.forceSettingsBodyOpen(enabledHostEl);
    }
    renderGeolocationEnabledSettings(containerEl: HTMLElement, rerenderEnabled: () => void): void {
        containerEl.empty();
        if (!this.plugin.settings.geolocationEnabled) return;

        const geolocationSetupEl = this.createSettingsRevealContainer(containerEl, "bfm-autotag-subcategory");
        geolocationSetupEl.createEl("h4", { text: "Geolocation Setup" });
        new Setting(geolocationSetupEl)
            .setName("Reverse geocode provider")
            .setDesc("Coordinates are always local metadata. Place names require reverse geocoding. Public Nominatim uses a polite hardcoded limit of 1 request every 2 seconds and 250 requests per day; blocked requests are queued and normal image processing continues.")
            .addDropdown(dropdown => dropdown
                .addOption("disabled", "Coordinates only")
                .addOption("public-nominatim", "Public Nominatim")
                .addOption("local-nominatim", "Local Nominatim")
                .setValue(this.plugin.settings.geolocationProvider)
                .onChange(async value => {
                    this.plugin.settings.geolocationProvider = value as GeolocationProvider;
                    await this.plugin.saveSettings();
                    this.animateSettingsContent(localNominatimHostEl, renderLocalNominatimSettings);
                }));

        const localNominatimHostEl = geolocationSetupEl.createDiv();
        const renderLocalNominatimSettings = () => {
            localNominatimHostEl.empty();
            if (this.plugin.settings.geolocationProvider !== "local-nominatim") return;
            const localNominatimEl = localNominatimHostEl.createDiv({ cls: "bfm-autotag-property-panel" });
            localNominatimEl.createEl("h5", { text: "Local Nominatim" });
            new Setting(localNominatimEl)
                .setName("Local Nominatim URL")
                .setDesc("Local reverse geocoding endpoint. Notice: Empty Fallback to Default.")
                .addText(text => text
                    .setPlaceholder(DEFAULT_SETTINGS.geolocationLocalUrl)
                    .setValue(this.plugin.settings.geolocationLocalUrl)
                    .onChange(async value => {
                        this.plugin.settings.geolocationLocalUrl = value.trim() || DEFAULT_SETTINGS.geolocationLocalUrl;
                        await this.plugin.saveSettings();
                    }));

            localNominatimEl.createEl("p", {
                text: "Local Nominatim removes public service limits, but it requires installing and importing map data. Storage can range from a small regional extract to hundreds of GB for large datasets.",
                cls: "setting-item-description",
            });
            new Setting(localNominatimEl)
                .setName("Local Nominatim setup")
                .setDesc("Opens the official Nominatim installation documentation in your browser.")
                .addButton(button => button
                    .setButtonText("Open Setup Docs")
                    .onClick(() => window.open("https://nominatim.org/release-docs/latest/admin/Installation/")));
            this.enhanceInfoDescriptionAnimations(localNominatimHostEl);
        };
        renderLocalNominatimSettings();
        if (this.plugin.settings.geolocationProvider === "local-nominatim") this.forceSettingsBodyOpen(localNominatimHostEl);

        const propertiesHostEl = containerEl.createDiv();
        const renderGeolocationProperties = () => {
            propertiesHostEl.empty();
            const propertiesEl = this.createSettingsRevealContainer(propertiesHostEl, "bfm-autotag-subcategory");
            propertiesEl.createEl("h4", { text: "Geolocation Tags Properties" });
            propertiesEl.createEl("p", {
                text: "Choose which location fields to write and rename their frontmatter properties. These properties are managed here and hidden from the general property-list dropdown when Clear Dropdown is on.",
                cls: "setting-item-description",
            });
            const propertyListEl = propertiesEl.createDiv({ cls: "bfm-autotag-geolocation-property-list" });
            const updateGeolocationPropertyTitles = () => {
                const titles = Array.from(propertyListEl.querySelectorAll("[data-bfm-geolocation-property-title]")) as HTMLElement[];
                titles.forEach((titleEl, index) => titleEl.setText(`Geolocation Property ${index + 1}`));
            };
            const renderGeolocationPropertyPanel = (mapping: GeolocationPropertyMapping, index: number) => {
                const propertyPanelEl = propertyListEl.createDiv({ cls: "bfm-autotag-property-panel" });
                propertyPanelEl.dataset.geolocationPropertyId = mapping.id;
                this.applyRecentlyAddedPanelHighlight(propertyPanelEl, "geolocation-property", mapping.id);
                propertyPanelEl.createEl("h5", {
                    text: `Geolocation Property ${index + 1}`,
                    attr: { "data-bfm-geolocation-property-title": "true" },
                });
                const setting = new Setting(propertyPanelEl)
                    .setName("Location field")
                    .setDesc("Select the geolocation value and the frontmatter property it should write to.");
                setting.addDropdown(dropdown => {
                    GEOLOCATION_FIELD_OPTIONS.forEach(option => dropdown.addOption(option.field, option.label));
                    dropdown
                        .setValue(mapping.field)
                        .onChange(async value => {
                            mapping.field = value as GeolocationField;
                            if (!mapping.property) mapping.property = this.plugin.getDefaultGeolocationPropertyName(mapping.field);
                            await this.plugin.saveSettings();
                        });
                });
                setting.addText(text => {
                    this.attachTextSuggestions(text.inputEl, this.getPropertyNameSuggestions());
                    text.setPlaceholder(this.plugin.getDefaultGeolocationPropertyName(mapping.field))
                    .setValue(mapping.property)
                    .onChange(async value => {
                        mapping.property = this.plugin.normalizePropertyName(value, this.plugin.getDefaultGeolocationPropertyName(mapping.field));
                        await this.plugin.saveSettings();
                    });
                });
                setting.addButton(button => button
                    .setIcon("trash")
                    .setTooltip("Delete geolocation property")
                    .onClick(() => {
                        new ConfirmDeleteFolderPropertyMappingModal(
                            this.app,
                            mapping.property || this.plugin.getDefaultGeolocationPropertyName(mapping.field),
                            async () => {
                                this.plugin.settings.geolocationProperties = this.plugin.settings.geolocationProperties.filter(candidate => candidate.id !== mapping.id);
                                await this.plugin.saveSettings();
                                this.animateElementHeightChange(propertiesHostEl, () => {
                                    propertyPanelEl.remove();
                                    updateGeolocationPropertyTitles();
                                }, 360);
                            }
                        ).open();
                    }));

                const formatSetting = new Setting(propertyPanelEl)
                    .setName("Geolocation Properties Formatting");
                const formatPreviewEl = formatSetting.controlEl.createDiv();
                this.renderFormatPreview(formatPreviewEl, "Preview", mapping.format, "info");
                formatSetting.addText(text => text
                    .setPlaceholder("[[Example]]")
                    .setValue(mapping.format)
                    .onChange(async value => {
                        mapping.format = value;
                        this.renderFormatPreview(formatPreviewEl, "Preview", mapping.format, "info");
                        await this.plugin.saveSettings();
                    }));
                this.enhanceInfoDescriptionAnimations(propertyPanelEl);
                return propertyPanelEl;
            };

            this.plugin.settings.geolocationProperties.forEach((mapping, index) => {
                renderGeolocationPropertyPanel(mapping, index);
            });

            new Setting(propertiesEl)
                .setName("Add geolocation property")
                .setDesc("Adds another geolocation output field.")
                .addButton(button => button
                    .setButtonText("Add Property")
                    .setCta()
                    .onClick(async () => {
                        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                        this.markRecentlyAddedPanel("geolocation-property", id);
                        this.plugin.settings.geolocationProperties.push({
                            id,
                            field: "country",
                            property: "country",
                            format: "",
                        });
                        const addedMapping = this.plugin.settings.geolocationProperties[this.plugin.settings.geolocationProperties.length - 1];
                        this.animateElementHeightChange(propertiesHostEl, () => {
                            renderGeolocationPropertyPanel(addedMapping, this.plugin.settings.geolocationProperties.length - 1);
                            updateGeolocationPropertyTitles();
                        }, 360);
                        await this.plugin.saveSettings();
                    }));
            this.wrapSubcategoryPanels(propertiesHostEl);
            this.enhanceInfoDescriptionAnimations(propertiesHostEl);
        };
        renderGeolocationProperties();

        const fixEl = this.createSettingsRevealContainer(containerEl, "bfm-autotag-subcategory");
        const getQueuedGeolocationDesc = () => {
            const queuedCount = this.plugin.settings.pendingGeocodeJobs.length;
            return `${queuedCount} geolocation lookup${queuedCount === 1 ? "" : "s"} currently queued.`;
        };
        fixEl.createEl("h4", { text: "Fix" });
        const fixPanelEl = fixEl.createDiv({ cls: "bfm-autotag-property-panel bfm-autotag-geolocation-fix-panel" });
        const retryQueuedGeolocationSetting = new Setting(fixPanelEl)
            .setName("Retry queued Geolocation Tags")
            .setDesc(getQueuedGeolocationDesc())
            .addButton(button => button
                .setButtonText("Retry Queue")
                .onClick(async () => {
                    await this.plugin.retryQueuedGeolocations(true);
                    this.animateSettingsContent(containerEl, rerenderEnabled);
                }));
        new Setting(fixPanelEl)
            .setName("Copy queued geolocation details")
            .setDesc("Copies queued geolocation lookup details to the clipboard.")
            .addButton(button => button
                .setButtonText("Copy Details")
                .onClick(async () => this.plugin.copyQueuedGeolocationsToClipboard()));
        this.renderMoveAffectedFilesSetting(
            fixPanelEl,
            "Choose a vault folder and move the image/note files that belong to queued geolocation lookups there.",
            "Queued Geolocations",
            "queued geolocation file",
            () => this.plugin.getQueuedGeolocationFiles()
        );
        new Setting(fixPanelEl)
            .setName("Clear queued Geolocation Tags")
            .setDesc("Clears queued geolocation lookups without changing files or notes.")
            .addButton(button => {
                button
                    .setButtonText("Clear Queue")
                    .setWarning()
                    .onClick(() => {
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Clear queued geolocation lookups?",
                            "This clears the geolocation lookup queue without changing files or notes.",
                            "Clear Queue",
                            async () => {
                                await this.plugin.clearQueuedGeolocations();
                                retryQueuedGeolocationSetting.setDesc(getQueuedGeolocationDesc());
                            }
                        ).open();
                    });
                button.buttonEl.addClass("bfm-autotag-danger-button");
            });
        this.wrapSubcategoryPanels(containerEl);
        this.decorateSettingsHeadings(containerEl);
        this.enhanceInfoDescriptionAnimations(containerEl);
    }

    private settingsRefreshTimer: number | null = null;
    private processingStatusTimer: number | null = null;
    private healthDashboardTimer: number | null = null;
    private activeSettingsSection = "health";
    private settingsSearchQuery = "";
    private healthCheckResults = new Map<string, HealthCheckResult>();

    getActiveSettingAnchor(): { name: string; top: number } | null {
        const activeEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const settingEl = activeEl?.closest(".setting-item") as HTMLElement | null;
        const name = settingEl?.querySelector(".setting-item-name")?.textContent?.trim();
        if (!settingEl || !name) return null;
        return { name, top: settingEl.getBoundingClientRect().top };
    }

    restoreSettingAnchor(anchor: { name: string; top: number } | null): void {
        if (!anchor) return;
        const settingEls = Array.from(this.containerEl.querySelectorAll(".setting-item")) as HTMLElement[];
        const matchingEl = settingEls.find(settingEl => settingEl.querySelector(".setting-item-name")?.textContent?.trim() === anchor.name);
        if (!matchingEl) return;
        const nextTop = matchingEl.getBoundingClientRect().top;
        if (Number.isFinite(nextTop)) {
            window.scrollBy(0, nextTop - anchor.top);
        }
    }

    refreshDisplayAnimated(): void {
        if (this.settingsRefreshTimer !== null) {
            window.clearTimeout(this.settingsRefreshTimer);
        }
        this.closeInfoDescriptions();
        const anchor = this.getActiveSettingAnchor();
        this.settingsRefreshTimer = window.setTimeout(() => {
            this.settingsRefreshTimer = null;
            this.display();
            this.restoreSettingAnchor(anchor);
        }, 80);
    }

    getSettingsSections(): { id: string; label: string; icon: string; keywords: string[] }[] {
        return [
            { id: "health", label: "Health", icon: "activity", keywords: ["health", "check", "test", "status", "ollama", "ai image analyzer", "nominatim", "bfm", "queue", "duplicate", "failed", "processed"] },
            { id: "setup", label: "Setup", icon: "wrench", keywords: ["overview", "how it works", "start", "setup", "base path", "bfm", "file name", "location", "format"] },
            { id: "search", label: "Search", icon: "search", keywords: ["find", "settings", "options"] },
            { id: "folder-tags", label: "Folder Tags", icon: "folder", keywords: ["folder", "property lists", "fallback", "candidates"] },
            { id: "ai-tags", label: "AI Tags", icon: "sparkles", keywords: ["ollama", "model", "qwen", "filename", "candidate", "generated tags"] },
            { id: "geolocation", label: "Geolocation Tags", icon: "map-pin", keywords: ["gps", "reverse geocode", "nominatim", "location"] },
            { id: "properties", label: "Properties", icon: "database", keywords: ["frontmatter", "template", "linktofile", "aitags", "aidescription", "embed"] },
            { id: "vault-awareness", label: "Vault Awareness", icon: "vault", keywords: ["vault", "vocabulary", "linguistic", "known concepts"] },
            { id: "bridge", label: "Bridge", icon: "waypoints", keywords: ["manual bridge", "enrichment", "rules", "subject"] },
            { id: "processing", label: "Processing & Queue", icon: "list-checks", keywords: ["queue", "workers", "wait", "bulk"] },
            { id: "duplicates", label: "Duplicates", icon: "copy-check", keywords: ["duplicate", "hash", "pair", "manual pairing", "replace"] },
            { id: "fix-recover", label: "Fix / Recover", icon: "wrench", keywords: ["failed", "retry", "recover", "help", "processed", "forget", "reprocess"] },
            { id: "qol", label: "QoL", icon: "sliders-horizontal", keywords: ["shutdown", "delete pair", "quality of life"] },
        ];
    }

    getSettingsSectionIcon(id: string): string {
        return this.getSettingsSections().find(section => section.id === id)?.icon ?? "circle";
    }

    getSettingsHeadingIcon(title: string): string | null {
        const icons: Record<string, string> = {
            "Path Setup": "folder-cog",
            "Setup - BFM Paths": "folder-cog",
            "Plugin Properties": "database",
            "Folder Properties": "folder-tag",
            "Fallback": "corner-down-right",
            "Frontmatter": "file-text",
            "Geolocation Setup": "map-pinned",
            "Geolocation Tags": "map-pin",
            "Geolocation Tags - Reverse Geocode": "map-pin",
            "Geolocation Tags Properties": "map-pin-plus",
            "Fix": "wrench",
            "AI Setup": "cpu",
            "AI Tags": "sparkles",
            "AI Tags - AI Image Analyzer": "image",
            "AI Tags - Ollama": "cpu",
            "AI Properties": "sparkles",
            "Candidate Modes": "list-filter",
            "Health": "activity",
            "Setup Profiles": "package-open",
            "Folder Tags": "folder-tag",
            "Vault Awareness": "vault",
            "Bridge": "waypoints",
            "Processing & Queue": "list-checks",
            "Fix / Recover": "wrench",
            "Duplicate Setup": "copy-check",
            "Duplicates": "copy-check",
            "Duplicate Fix": "wrench",
            "Duplicate Search": "search-check",
            "Manual Pairing": "link",
            "Vault Setup": "vault",
            "Bridge Setup": "waypoints",
            "Processing Setup": "list-checks",
            "Companion Notes": "file-stack",
            "Clear Dropdown": "list-x",
            "Single File": "refresh-cw",
            "Existing Vaults": "folder-sync",
            "Failed Files": "triangle-alert",
            "Processed Files": "circle-check",
            "Limited File Type Warnings": "file-warning",
        };
        return icons[title] ?? null;
    }

    decorateHeadingWithIcon(headingEl: HTMLElement, icon: string | null): void {
        if (!icon || headingEl.querySelector(".bfm-autotag-heading-icon")) return;
        const label = headingEl.textContent?.trim() ?? "";
        headingEl.empty();
        const iconEl = headingEl.createSpan({ cls: "bfm-autotag-heading-icon" });
        setIcon(iconEl, icon);
        headingEl.createSpan({ text: label, cls: "bfm-autotag-heading-label" });
    }

    decorateSettingsHeadings(containerEl: HTMLElement): void {
        (Array.from(containerEl.querySelectorAll("h3[id^='bfm-autotag-']")) as HTMLElement[]).forEach(heading => {
            const id = heading.id.replace("bfm-autotag-", "");
            this.decorateHeadingWithIcon(heading, this.getSettingsSectionIcon(id));
        });
        (Array.from(containerEl.querySelectorAll("h4, h5")) as HTMLElement[]).forEach(heading => {
            this.decorateHeadingWithIcon(heading, this.getSettingsHeadingIcon(heading.textContent?.trim() ?? ""));
        });
    }

    renderSettingsNavigation(containerEl: HTMLElement): void {
        const sections = this.getSettingsSections();
        if (!sections.some(section => section.id === this.activeSettingsSection)) {
            this.activeSettingsSection = "health";
        }

        const navEl = containerEl.createDiv({ cls: "bfm-autotag-settings-tabs" });
        sections.forEach(section => {
            const button = navEl.createEl("button");
            button.type = "button";
            const iconEl = button.createSpan({ cls: "bfm-autotag-tab-icon" });
            setIcon(iconEl, section.icon);
            button.createSpan({ text: section.label, cls: "bfm-autotag-tab-label" });
            if (section.id === this.activeSettingsSection) button.addClass("is-active");
            button.onclick = () => {
                this.closeInfoDescriptions();
                this.activeSettingsSection = section.id;
                this.display();
            };
        });
    }
    renderHowItWorksPanel(containerEl: HTMLElement, title: string, body: string, warning = false): void {
        const panel = containerEl.createDiv({ cls: warning ? "bfm-autotag-how-panel bfm-autotag-how-panel-warning" : "bfm-autotag-how-panel" });
        panel.createEl("strong", { text: title });
        panel.createEl("p", { text: body, cls: "setting-item-description" });
    }

    readSettingsProfileBrowserFile(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
            reader.readAsText(file);
        });
    }

    async importSettingsProfileBrowserFiles(files: FileList | File[] | null | undefined): Promise<number> {
        const jsonFiles = Array.from(files ?? []).filter(file => file.name.toLowerCase().endsWith(".json"));
        let imported = 0;
        for (const file of jsonFiles) {
            const text = await this.readSettingsProfileBrowserFile(file);
            const profile = await this.plugin.importSettingsProfileJson(text, file.name);
            if (profile) imported += 1;
        }
        if (jsonFiles.length === 0) new Notice("Drop or choose a JSON settings file.");
        return imported;
    }

    renderSettingsProfileVideoPlaceholder(containerEl: HTMLElement, profile: SettingsProfileSummary | null, animate = false): void {
        const render = () => {
            containerEl.empty();
            if (!this.plugin.isDevSettingsProfile(profile)) return;
            const panel = containerEl.createDiv({ cls: "bfm-autotag-settings-profile-video" });
            const header = panel.createDiv({ cls: "bfm-autotag-settings-profile-video-header" });
            const iconEl = header.createSpan({ cls: "bfm-autotag-heading-icon" });
            setIcon(iconEl, "play-circle");
            header.createSpan({ text: "Dev setup video" });
            panel.createDiv({
                cls: "bfm-autotag-settings-profile-video-placeholder",
                text: "YouTube embed placeholder",
            });
        };
        if (!animate) {
            render();
            return;
        }
        if (this.plugin.isDevSettingsProfile(profile)) {
            this.animateSettingsContent(containerEl, render);
        } else {
            this.animateSettingsCollapseThenRender(containerEl, render);
        }
    }

    renderSettingsProfileSettings(containerEl: HTMLElement): void {
        containerEl.createEl("h4", { text: "Setup Profiles" });
        const panelEl = containerEl.createDiv({ cls: "bfm-autotag-property-panel bfm-autotag-settings-profile-panel" });
        const folderPath = this.plugin.getSettingsProfileFolderPath();
        panelEl.createEl("p", {
            cls: "setting-item-description",
            text: `Import, export, reset, and switch setup JSON files. Profiles are stored in ${folderPath}. Editing a non-custom setup creates a matching [Custom] copy automatically.`,
        });

        const fileInput = panelEl.createEl("input", {
            attr: { type: "file", accept: ".json,application/json", multiple: "true" },
        }) as HTMLInputElement;
        fileInput.style.display = "none";

        let profileDropdown: any = null;
        let profileSummaries: SettingsProfileSummary[] = [];
        let pendingProfileRename = "";
        let profileRenameInput: HTMLInputElement | null = null;
        let profileRenameButton: any = null;
        let profileDeleteButton: any = null;
        let videoHostEl: HTMLElement | null = null;
        const refreshProfileDropdown = async (animateVideo = false) => {
            profileSummaries = await this.plugin.listSettingsProfiles();
            const activeProfile = this.plugin.getActiveSettingsProfileFromList(profileSummaries);
            if (profileDropdown) {
                profileDropdown.selectEl.empty();
                profileSummaries.forEach(profile => {
                    const label = profile.custom && !this.plugin.hasCustomSettingsProfileMarker(profile.name)
                        ? `${profile.name}${SETTINGS_PROFILE_CUSTOM_SUFFIX}`
                        : profile.name;
                    profileDropdown.addOption(profile.id, label);
                });
                profileDropdown.setValue(activeProfile.id);
            }
            const canRename = this.plugin.isEditableCustomSettingsProfile(activeProfile);
            const editableProfileName = this.plugin.getEditableSettingsProfileName(activeProfile.name);
            pendingProfileRename = canRename ? editableProfileName : "";
            if (profileRenameInput) {
                profileRenameInput.disabled = !canRename;
                profileRenameInput.value = pendingProfileRename;
                profileRenameInput.placeholder = canRename ? editableProfileName : "Only custom profiles";
            }
            profileRenameButton?.setDisabled(!canRename);
            profileDeleteButton?.setDisabled(activeProfile.builtIn || !activeProfile.path);
            if (videoHostEl) this.renderSettingsProfileVideoPlaceholder(videoHostEl, activeProfile, animateVideo);
        };

        const dropEl = panelEl.createDiv({ cls: "bfm-autotag-settings-profile-dropzone" });
        dropEl.createDiv({ text: "Drop setup JSON files here", cls: "bfm-autotag-settings-profile-dropzone-title" });
        dropEl.createDiv({ text: "Imported setups stay untouched; edits are saved into a [Custom] copy.", cls: "setting-item-description" });
        dropEl.addEventListener("dragover", event => {
            event.preventDefault();
            dropEl.addClass("is-dragover");
        });
        dropEl.addEventListener("dragleave", () => dropEl.removeClass("is-dragover"));
        dropEl.addEventListener("drop", async event => {
            event.preventDefault();
            dropEl.removeClass("is-dragover");
            const imported = await this.importSettingsProfileBrowserFiles(event.dataTransfer?.files);
            if (imported > 0) await refreshProfileDropdown();
        });

        fileInput.addEventListener("change", async () => {
            const imported = await this.importSettingsProfileBrowserFiles(fileInput.files);
            fileInput.value = "";
            if (imported > 0) await refreshProfileDropdown();
        });

        new Setting(panelEl)
            .setName("Import / export settings JSON")
            .setDesc("Export the current setup as JSON to a location you choose or import setup JSON files into the setup-profile folder.")
            .addButton(button => button
                .setButtonText("Import JSON")
                .onClick(() => fileInput.click()))
            .addButton(button => button
                .setButtonText("Export Active")
                .setCta()
                .onClick(async () => {
                    await this.plugin.exportCurrentSettingsProfile();
                }));

        new Setting(panelEl)
            .setName("Active setup profile")
            .setDesc("Choose a saved setup. If you edit an imported or built-in setup, Autotag saves your changes into a new [Custom] copy.")
            .addDropdown(dropdown => {
                profileDropdown = dropdown;
                dropdown.addOption(this.plugin.settings.settingsProfileId, "Loading profiles...");
                dropdown.setValue(this.plugin.settings.settingsProfileId);
                dropdown.onChange(async value => {
                    await this.plugin.applySettingsProfile(value);
                    await refreshProfileDropdown(true);
                    window.setTimeout(() => this.refreshDisplayAnimated(), 560);
                });
            });

        new Setting(panelEl)
            .setName("Rename current custom profile")
            .setDesc("Only custom setup profiles can be renamed. The [Custom] tag is kept automatically.")
            .addText(text => {
                profileRenameInput = text.inputEl;
                text.setPlaceholder("Johnies")
                    .onChange(value => {
                        pendingProfileRename = value;
                    });
            })
            .addButton(button => {
                profileRenameButton = button;
                button
                    .setButtonText("Rename")
                    .onClick(async () => {
                        const renamed = await this.plugin.renameActiveCustomSettingsProfile(pendingProfileRename);
                        if (renamed) await refreshProfileDropdown();
                    });
            });

        new Setting(panelEl)
            .setName("Delete profile")
            .setDesc("Deletes the selected imported or custom profile JSON. Built-in Default and Dev profiles cannot be deleted.")
            .addButton(button => {
                profileDeleteButton = button;
                button
                    .setButtonText("Delete Profile")
                    .setWarning()
                    .onClick(() => {
                        const activeProfile = this.plugin.getActiveSettingsProfileFromList(profileSummaries);
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Delete setup profile?",
                            `This deletes '${activeProfile.name}' from the setup-profile folder and switches back to Default. Processed files, failures, duplicate hashes, and pair records are kept.`,
                            "Delete Profile",
                            async () => {
                                const deleted = await this.plugin.deleteActiveSettingsProfile();
                                if (deleted) this.refreshDisplayAnimated();
                            }
                        ).open();
                    });
                button.buttonEl.addClass("bfm-autotag-danger-button");
            });

        videoHostEl = panelEl.createDiv({ cls: "bfm-autotag-settings-profile-video-host" });
        void refreshProfileDropdown();
    }

    renderSoftWarningPanel(containerEl: HTMLElement, title: string, body: string): void {
        const panel = containerEl.createDiv({ cls: "bfm-autotag-soft-warning-panel" });
        panel.createEl("strong", { text: title });
        panel.createEl("p", { text: body, cls: "setting-item-description" });
    }

    renderAttentionWarningPanel(containerEl: HTMLElement, id: string, title: string, lines: string[]): void {
        if (lines.length === 0) return;
        const panel = containerEl.createDiv({ cls: "bfm-autotag-attention-warning-panel" });
        panel.id = id;
        panel.createEl("strong", { text: title });
        const listEl = panel.createEl("ul");
        lines.forEach(line => listEl.createEl("li", { text: line }));
    }

    renderMoveAffectedFilesSetting(containerEl: HTMLElement, description: string, folderName: string, label: string, getFiles: () => TFile[]): void {
        new Setting(containerEl)
            .setName("Move affected Files")
            .setDesc(description)
            .addButton(button => button
                .setButtonText("Choose Target")
                .onClick(async () => {
                    await this.plugin.moveAffectedFilesToChosenFolder(getFiles(), label, folderName);
                    this.refreshDisplayAnimated();
                }));
    }

    getHealthCheckFallback(id: string, label: string): HealthCheckResult {
        return this.healthCheckResults.get(id) ?? {
            tone: "neutral",
            value: "Not checked",
            message: "",
            checks: [{ tone: "neutral", text: "Waiting for automatic check" }],
        };
    }

    getSetupHealthChecks(baseFolder: unknown, noteFolder: unknown, exampleNoteName: string): HealthDashboardCheck[] {
        const bfmPlugin = (this.app as any).plugins?.plugins?.["obsidian-binary-file-manager-plugin"];
        const baseExists = baseFolder instanceof TFolder;
        const noteExists = noteFolder instanceof TFolder;
        return [
            { tone: bfmPlugin ? "success" : "danger", text: "Binary File Manager loaded" },
            { tone: baseExists && noteExists ? "success" : "danger", text: "Both folders exist" },
                    { tone: exampleNoteName ? "success" : "danger", text: `Example test: ${exampleNoteName || "No filename"}` },
        ];
    }

    getHealthCheckIconName(tone: HealthDashboardCheckTone): string {
        if (tone === "success") return "circle-check";
        if (tone === "warning") return "triangle-alert";
        if (tone === "danger") return "circle-x";
        if (tone === "accent" || tone === "spinner") return "loader-circle";
        return "circle";
    }

    renderHealthDashboardChecks(containerEl: HTMLElement, checks: HealthDashboardCheck[] | undefined): void {
        containerEl.empty();
        containerEl.toggleClass("is-empty", !checks || checks.length === 0);
        (checks ?? []).forEach(check => {
            const rowEl = containerEl.createDiv({ cls: `bfm-autotag-health-check-row is-${check.tone}` });
            const iconEl = rowEl.createSpan({ cls: "bfm-autotag-health-check-icon" });
            setIcon(iconEl, this.getHealthCheckIconName(check.tone));
            const textEl = rowEl.createSpan({ cls: "bfm-autotag-health-check-text" });
            textEl.createSpan({ text: check.text });
            if (check.tone === "spinner") {
                const dotsEl = textEl.createSpan({ cls: "bfm-autotag-loading-dots" });
                [0, 1, 2].forEach(() => dotsEl.createSpan({ text: "." }));
            }
        });
    }

    renderHealthDashboardValue(containerEl: HTMLElement, card: HealthDashboardCard): void {
        containerEl.empty();
        containerEl.createSpan({ text: card.value });
    }

    getHealthDashboardCards(): HealthDashboardCard[] {
        const basePath = (this.plugin.settings.basePath || DEFAULT_SETTINGS.basePath).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        const notePath = (this.plugin.settings.bfmNewFileLocation || DEFAULT_SETTINGS.bfmNewFileLocation).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        const baseFolder = this.app.vault.getAbstractFileByPath(basePath);
        const noteFolder = this.app.vault.getAbstractFileByPath(notePath);
        const exampleNoteName = this.plugin.renderBfmFileNameFormatFromParts("Example.jpg", `${basePath}/Example.jpg`, "jpg");
        const setupChecks = this.healthCheckResults.get("setup-bfm")?.checks ?? this.getSetupHealthChecks(baseFolder, noteFolder, exampleNoteName);
        const folderMappingCount = this.plugin.settings.folderPropertyMappings.length;
        const templateUnknown = this.plugin.getFrontmatterPreviewTemplateCheck();
        const templateMissing = this.plugin.getMissingTemplateDeclarationProperties();
        const vocabularyCount = this.plugin.vaultVocabulary.size;
        const vaultCandidateProperties = this.plugin.getVaultAwarenessCandidateProperties();
        const bridgeRuleCount = this.plugin.parseManualSubjectBridgeRules().length;
        const enrichmentRuleCount = this.plugin.parseManualEnrichmentRules().size;
        const visibleProcessingQueueCount = this.plugin.getUniqueProcessingPaths().length;
        const activeRunCount = this.plugin.currentRunIds.size;
        const processingCounts = this.plugin.getProcessingActivityCounts();
        const duplicateUnlinkedHashCount = this.plugin.getUnlinkedDuplicateRecords().length;
        const duplicateUnhashedFileCount = this.plugin.getUnhashedFiles().length;
        const duplicateUnpairedFileCount = this.plugin.getUnpairedFiles().length;
        const duplicateAttentionCount = duplicateUnlinkedHashCount + duplicateUnhashedFileCount + duplicateUnpairedFileCount;
        const duplicateProtectionActive = this.plugin.settings.useDuplicateProtection && this.plugin.settings.duplicateDetectionMode !== "off";
        const recoverUnprocessedBaseFiles = this.plugin.getUnprocessedBaseFiles();
        const recoverFailedCount = this.plugin.settings.failedFiles.length;
        const recoverProcessedCount = this.plugin.settings.processedFiles.length;
        const duplicateSolutionAnchorId = duplicateAttentionCount > 0 ? "bfm-autotag-duplicate-cleanup-warning" : undefined;
        const recoverSolutionAnchorId = recoverFailedCount > 0 || recoverUnprocessedBaseFiles.length > 0 ? "bfm-autotag-fix-recover-warning" : undefined;
        const setupCheck = this.getHealthCheckFallback("setup-bfm", "Setup - BFM Paths");
        const analyzerCheck = this.getHealthCheckFallback("ai-analyzer", "AI Tags - AI Image Analyzer");
        const ollamaCheck = this.getHealthCheckFallback("ai-ollama", "AI Tags - Ollama");
        const geocodeCheck = this.getHealthCheckFallback("geolocation-geocode", "Geolocation Tags - Reverse Geocode");

        return [
            {
                id: "setup-bfm",
                label: "Setup - BFM Paths",
                icon: this.getSettingsSectionIcon("setup"),
                targetSectionId: "setup",
                value: this.healthCheckResults.has("setup-bfm")
                    ? setupCheck.value
                    : baseFolder instanceof TFolder && noteFolder instanceof TFolder ? "Ready" : "Needs check",
                description: setupCheck.message,
                checks: setupChecks,
                tone: this.healthCheckResults.has("setup-bfm") ? setupCheck.tone : baseFolder instanceof TFolder && noteFolder instanceof TFolder ? "success" : "danger",
            },
            {
                id: "folder-tags",
                label: "Folder Tags",
                icon: this.getSettingsSectionIcon("folder-tags"),
                targetSectionId: "folder-tags",
                value: this.plugin.settings.useFolderTags ? "On" : "Off",
                description: "",
                checks: [
                    { tone: this.plugin.settings.useFolderTags ? "success" : "neutral", text: this.plugin.settings.useFolderTags ? "Folder Tags enabled" : "Folder Tags disabled" },
                    { tone: folderMappingCount > 0 ? "success" : "neutral", text: `${folderMappingCount} folder propert${folderMappingCount === 1 ? "y" : "ies"} configured` },
                    { tone: this.plugin.settings.folderFallbackProperty ? "success" : "neutral", text: `Fallback property: ${this.plugin.settings.folderFallbackProperty || DEFAULT_SETTINGS.folderFallbackProperty}` },
                ],
                tone: this.plugin.settings.useFolderTags ? "success" : "neutral",
            },
            {
                id: "ai-analyzer",
                label: "AI Tags - AI Image Analyzer",
                icon: this.getSettingsSectionIcon("ai-tags"),
                targetSectionId: "ai-tags",
                value: analyzerCheck.value,
                description: analyzerCheck.message,
                checks: analyzerCheck.checks,
                tone: analyzerCheck.tone,
            },
            {
                id: "ai-ollama",
                label: "AI Tags - Ollama",
                icon: this.getSettingsSectionIcon("ai-tags"),
                targetSectionId: "ai-tags",
                value: ollamaCheck.value,
                description: ollamaCheck.message,
                checks: ollamaCheck.checks,
                tone: ollamaCheck.tone,
            },
            {
                id: "geolocation-geocode",
                label: "Geolocation Tags - Reverse Geocode",
                icon: this.getSettingsSectionIcon("geolocation"),
                targetSectionId: "geolocation",
                value: geocodeCheck.value,
                description: geocodeCheck.message,
                checks: geocodeCheck.checks,
                tone: geocodeCheck.tone,
            },
            {
                id: "properties-template-check",
                label: "Properties - Template Check",
                icon: this.getSettingsSectionIcon("properties"),
                targetSectionId: "properties",
                value: templateUnknown.length > 0 ? `${templateUnknown.length} unknown` : "Clean",
                description: "",
                checks: [
                    { tone: templateUnknown.length > 0 ? "warning" : "success", text: templateUnknown.length > 0 ? "Unknown template entries" : "Template check clean" },
                ],
                tone: templateUnknown.length > 0 ? "warning" : "success",
            },
            {
                id: "properties-template-suggestions",
                label: "Properties - Template Suggestions",
                icon: this.getSettingsSectionIcon("properties"),
                targetSectionId: "properties",
                value: templateMissing.length > 0 ? `${templateMissing.length} undeclared` : "Declared",
                description: "",
                checks: [
                    { tone: templateMissing.length > 0 ? "warning" : "success", text: templateMissing.length > 0 ? "Optional declarations" : "All active properties declared" },
                ],
                tone: templateMissing.length > 0 ? "warning" : "success",
            },
            {
                id: "vault-awareness",
                label: "Vault Awareness",
                icon: this.getSettingsSectionIcon("vault-awareness"),
                targetSectionId: "vault-awareness",
                value: this.plugin.settings.vaultAwarenessEnabled ? `${vocabularyCount} known` : "Off",
                description: "",
                checks: [
                    { tone: this.plugin.settings.vaultAwarenessEnabled ? "success" : "neutral", text: this.plugin.settings.vaultAwarenessEnabled ? "Vault Awareness enabled" : "Vault Awareness disabled" },
                    { tone: vaultCandidateProperties.length > 0 ? "success" : "neutral", text: `${vaultCandidateProperties.length} candidate propert${vaultCandidateProperties.length === 1 ? "y" : "ies"}` },
                    { tone: vocabularyCount > 0 ? "success" : "neutral", text: `${vocabularyCount} known term${vocabularyCount === 1 ? "" : "s"}` },
                ],
                tone: this.plugin.settings.vaultAwarenessEnabled && vocabularyCount > 0 ? "success" : "neutral",
            },
            {
                id: "bridge",
                label: "Bridge",
                icon: this.getSettingsSectionIcon("bridge"),
                targetSectionId: "bridge",
                value: this.plugin.settings.bridgeEnabled ? "On" : "Off",
                description: "",
                checks: [
                    { tone: this.plugin.settings.bridgeEnabled ? "success" : "neutral", text: this.plugin.settings.bridgeEnabled ? "Bridge enabled" : "Bridge disabled" },
                    { tone: bridgeRuleCount > 0 ? "success" : "neutral", text: `${bridgeRuleCount} subject bridge rule${bridgeRuleCount === 1 ? "" : "s"}` },
                    { tone: enrichmentRuleCount > 0 ? "success" : "neutral", text: `${enrichmentRuleCount} manual enrichment rule${enrichmentRuleCount === 1 ? "" : "s"}` },
                ],
                tone: this.plugin.settings.bridgeEnabled && bridgeRuleCount + enrichmentRuleCount > 0 ? "success" : "neutral",
            },
            {
                id: "processing",
                label: "Processing & Queue",
                icon: this.getSettingsSectionIcon("processing"),
                targetSectionId: "processing",
                value: this.plugin.isProcessingActivityActive()
                    ? "Processing"
                    : "Idle",
                description: "",
                checks: [
                    { tone: this.plugin.isProcessingActivityActive() ? "spinner" : "success", text: this.plugin.isProcessingActivityActive() ? `Processing ${processingCounts.completed}/${processingCounts.total || visibleProcessingQueueCount} Files` : "Queue idle" },
                    { tone: "neutral", text: `${this.plugin.settings.parallelWorkers} worker limit` },
                ],
                tone: visibleProcessingQueueCount > 0 || activeRunCount > 0 ? "accent" : "success",
            },
            {
                id: "duplicates",
                label: "Duplicates",
                icon: this.getSettingsSectionIcon("duplicates"),
                targetSectionId: "duplicates",
                solutionAnchorId: duplicateSolutionAnchorId,
                value: duplicateProtectionActive ? "Watching" : "Off",
                description: "",
                checks: [
                    { tone: duplicateProtectionActive ? "success" : "neutral", text: duplicateProtectionActive ? "Duplicate Protection enabled" : "Duplicate Protection disabled" },
                    { tone: duplicateAttentionCount > 0 ? "danger" : "success", text: `${duplicateAttentionCount} item${duplicateAttentionCount === 1 ? "" : "s"} may need attention` },
                    { tone: "neutral", text: `${this.plugin.getPairRecords().length} pair${this.plugin.getPairRecords().length === 1 ? "" : "s"} tracked` },
                ],
                tone: duplicateProtectionActive ? (duplicateAttentionCount > 0 ? "danger" : "success") : "neutral",
            },
            {
                id: "fix-recover",
                label: "Fix / Recover",
                icon: this.getSettingsSectionIcon("fix-recover"),
                targetSectionId: "fix-recover",
                solutionAnchorId: recoverSolutionAnchorId,
                value: recoverFailedCount > 0 ? `${recoverFailedCount} failed` : "No failures",
                description: "",
                checks: [
                    { tone: recoverFailedCount > 0 ? "danger" : "success", text: recoverFailedCount > 0 ? `${recoverFailedCount} failed file${recoverFailedCount === 1 ? "" : "s"}` : "No failed files" },
                    { tone: recoverUnprocessedBaseFiles.length > 0 ? "danger" : "success", text: `${recoverUnprocessedBaseFiles.length} unprocessed watched file${recoverUnprocessedBaseFiles.length === 1 ? "" : "s"}` },
                    { tone: "neutral", text: `${recoverProcessedCount} processed file${recoverProcessedCount === 1 ? "" : "s"} tracked` },
                ],
                tone: recoverFailedCount > 0 || recoverUnprocessedBaseFiles.length > 0 ? "danger" : "success",
            },
        ];
    }

    renderHealthDashboardCards(containerEl: HTMLElement, cards: HealthDashboardCard[]): Map<string, HealthDashboardCardRefs> {
        const refs = new Map<string, HealthDashboardCardRefs>();
        const gridEl = containerEl.createDiv({ cls: "bfm-autotag-health-grid bfm-autotag-health-dashboard-grid" });
        cards.forEach(card => {
            const cardEl = gridEl.createDiv({ cls: `bfm-autotag-health-card is-${card.tone ?? "neutral"}` });
            cardEl.addClass("is-clickable");
            cardEl.tabIndex = 0;
            cardEl.setAttr("role", "button");
            cardEl.setAttr("aria-label", `Open ${card.label} settings`);
            const openTarget = () => {
                this.activeSettingsSection = card.targetSectionId;
                this.display();
                window.setTimeout(() => {
                    const solutionEl = card.solutionAnchorId
                        ? this.containerEl.querySelector(`#${card.solutionAnchorId}`) as HTMLElement | null
                        : null;
                    if (solutionEl) {
                        solutionEl.scrollIntoView({ block: "center", behavior: "smooth" });
                    } else {
                        this.scrollSettingsToTop();
                    }
                }, 0);
            };
            cardEl.addEventListener("click", openTarget);
            cardEl.addEventListener("keydown", event => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                openTarget();
            });
            const labelEl = cardEl.createDiv({ cls: "bfm-autotag-health-card-label" });
            const iconEl = labelEl.createSpan({ cls: "bfm-autotag-health-card-icon" });
            setIcon(iconEl, card.icon);
            const labelTextEl = labelEl.createSpan({ cls: "bfm-autotag-health-card-label-text" });
            const labelParts = card.label.split(" - ");
            labelTextEl.createSpan({ text: labelParts[0], cls: "bfm-autotag-health-card-label-main" });
            if (labelParts.length > 1) {
                labelTextEl.createSpan({ text: labelParts.slice(1).join(" - "), cls: "bfm-autotag-health-card-label-sub" });
            }
            if (card.info) {
                const infoWrapEl = labelEl.createSpan({ cls: "bfm-autotag-health-info-wrap" });
                infoWrapEl.createSpan({ cls: "bfm-autotag-info-trigger", text: "i" });
                infoWrapEl.createSpan({ cls: "bfm-autotag-health-info", text: card.info });
            }
            const valueEl = cardEl.createDiv({ cls: "bfm-autotag-health-card-value" });
            this.renderHealthDashboardValue(valueEl, card);
            const descriptionEl = cardEl.createDiv({ text: card.description, cls: "bfm-autotag-health-card-description" });
            descriptionEl.toggleClass("is-empty", card.description.trim().length === 0);
            const checksEl = cardEl.createDiv({ cls: "bfm-autotag-health-checks" });
            this.renderHealthDashboardChecks(checksEl, card.checks);
            refs.set(card.id, { cardEl, valueEl, descriptionEl, checksEl });
        });
        return refs;
    }

    updateHealthDashboardCard(refs: Map<string, HealthDashboardCardRefs>, card: HealthDashboardCard, animate = false): void {
        const ref = refs.get(card.id);
        if (!ref) return;
        const update = () => {
            ref.cardEl.classList.remove("is-neutral", "is-success", "is-warning", "is-danger", "is-accent");
            ref.cardEl.addClass(`is-${card.tone ?? "neutral"}`);
            this.renderHealthDashboardValue(ref.valueEl, card);
            ref.descriptionEl.setText(card.description);
            ref.descriptionEl.toggleClass("is-empty", card.description.trim().length === 0);
            this.renderHealthDashboardChecks(ref.checksEl, card.checks);
        };
        if (animate && ref.cardEl.isConnected) {
            this.animateElementHeightChange(ref.cardEl, update, 280);
        } else {
            update();
        }
    }

    updateHealthDashboardCards(refs: Map<string, HealthDashboardCardRefs>, animate = false): void {
        this.getHealthDashboardCards().forEach(card => this.updateHealthDashboardCard(refs, card, animate));
    }

    renderActiveProcessingImageStrip(containerEl: HTMLElement): () => void {
        const panelEl = containerEl.createDiv({ cls: "bfm-autotag-active-image-strip-panel" });
        const headerEl = panelEl.createDiv({ cls: "bfm-autotag-active-image-strip-header" });
        const titleEl = headerEl.createDiv({ cls: "bfm-autotag-active-image-strip-title" });
        const titleIconEl = titleEl.createSpan({ cls: "bfm-autotag-active-image-strip-icon" });
        setIcon(titleIconEl, "image");
        titleEl.createSpan({ text: "Active Processing Images" });
        const queueCountEl = headerEl.createDiv({ cls: "bfm-autotag-active-image-strip-queued" });
        const rowEl = panelEl.createDiv({ cls: "bfm-autotag-active-image-strip-row" });
        let renderedSignature = "";

        const update = () => {
            if (!panelEl.isConnected) return;
            const activeFiles = this.plugin.getActiveProcessingImageFiles();
            const queuedCount = this.plugin.getQueuedProcessingImageCount();
            const signature = [
                activeFiles.map(file => `${file.path}:${file.stat.mtime}`).join("|"),
                queuedCount,
            ].join("::");
            if (signature === renderedSignature) return;
            renderedSignature = signature;

            queueCountEl.setText(queuedCount > 0 ? `+ ${queuedCount} queued` : "No queued images");
            rowEl.empty();
            panelEl.toggleClass("is-idle", activeFiles.length === 0);
            if (activeFiles.length === 0) {
                const emptyEl = rowEl.createDiv({ cls: "bfm-autotag-active-image-strip-empty" });
                emptyEl.setText("No images are actively processing.");
                return;
            }

            activeFiles.forEach(file => {
                const itemEl = rowEl.createDiv({ cls: "bfm-autotag-active-image-thumb" });
                itemEl.setAttr("title", file.path);
                const imageEl = itemEl.createEl("img", {
                    attr: {
                        src: this.app.vault.getResourcePath(file),
                        alt: file.name,
                    },
                });
                imageEl.addEventListener("error", () => {
                    itemEl.empty();
                    const fallbackEl = itemEl.createDiv({ cls: "bfm-autotag-active-image-thumb-fallback" });
                    setIcon(fallbackEl, "file-image");
                });
            });
        };

        update();
        return update;
    }

    async runHealthCheck(id: string, refs: Map<string, HealthDashboardCardRefs>, check: () => Promise<HealthCheckResult>): Promise<void> {
        const loadingCard = this.getHealthDashboardCards().find(card => card.id === id);
        if (loadingCard) {
            this.updateHealthDashboardCard(refs, {
                ...loadingCard,
                value: "Checking...",
                description: "",
                checks: [{ tone: "spinner", text: "Checking now" }],
                tone: "accent",
            }, true);
        }

        try {
            this.healthCheckResults.set(id, await check());
        } catch (error) {
            this.healthCheckResults.set(id, {
                tone: "danger",
                value: "Failed",
                message: "",
                checks: [{ tone: "danger", text: error instanceof Error ? error.message : "Health check failed" }],
            });
        }

        this.updateHealthDashboardCards(refs, true);
    }

    async runAllHealthChecks(refs: Map<string, HealthDashboardCardRefs>): Promise<void> {
        this.updateHealthDashboardCards(refs);
        await Promise.all([
            this.runHealthCheck("setup-bfm", refs, () => this.checkSetupBfmPaths()),
            this.runHealthCheck("ai-analyzer", refs, () => this.checkAiImageAnalyzer()),
            this.runHealthCheck("ai-ollama", refs, () => this.checkOllama()),
            this.runHealthCheck("geolocation-geocode", refs, () => this.checkReverseGeocode()),
        ]);
        this.updateHealthDashboardCards(refs, true);
    }

    async checkSetupBfmPaths(): Promise<HealthCheckResult> {
        const normalizeFolder = (path: string, fallback: string) => (path.trim() || fallback).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        const basePath = normalizeFolder(this.plugin.settings.basePath, DEFAULT_SETTINGS.basePath);
        const notePath = normalizeFolder(this.plugin.settings.bfmNewFileLocation, DEFAULT_SETTINGS.bfmNewFileLocation);
        const issues: string[] = [];
        const baseFolder = this.app.vault.getAbstractFileByPath(basePath);
        const noteFolder = this.app.vault.getAbstractFileByPath(notePath);
        const bfmPlugin = (this.app as any).plugins?.plugins?.["obsidian-binary-file-manager-plugin"];

        if (!(baseFolder instanceof TFolder)) issues.push(`Base Path not found: ${basePath}`);
        if (!(noteFolder instanceof TFolder)) issues.push(`BFM New File Location not found: ${notePath}`);
        if (!bfmPlugin) issues.push("Binary File Manager is not loaded.");

        const exampleNoteName = this.plugin.renderBfmFileNameFormatFromParts("Example.jpg", `${basePath}/Example.jpg`, "jpg");
        const checks = this.getSetupHealthChecks(baseFolder, noteFolder, exampleNoteName);
        if (issues.length > 0) {
            return { tone: "danger", value: "Missing", message: "", checks };
        }
        return { tone: "success", value: "Ready", message: "", checks };
    }

    async checkAiImageAnalyzer(): Promise<HealthCheckResult> {
        const analyzer = this.plugin.getAIImageAnalyzer();
        if (!analyzer) {
            return {
                tone: "danger",
                value: "Missing",
                message: "",
                checks: [{ tone: "danger", text: "AI Image Analyzer API loaded" }],
            };
        }
        if (typeof analyzer.analyzeImage !== "function" || typeof analyzer.canBeAnalyzed !== "function") {
            return {
                tone: "danger",
                value: "API mismatch",
                message: "",
                checks: [
                    { tone: "success", text: "AI Image Analyzer API loaded" },
                    { tone: "danger", text: "Expected API methods available" },
                ],
            };
        }

        const watchedFiles = this.plugin.getHashableBaseFiles();
        const analyzableFile = watchedFiles.find(file => {
            try {
                return analyzer.canBeAnalyzed(file);
            } catch (_) {
                return false;
            }
        });

        if (!analyzableFile) {
            return {
                tone: watchedFiles.length > 0 ? "danger" : "neutral",
                value: watchedFiles.length > 0 ? "No match" : "Ready",
                message: "",
                checks: [
                    { tone: "success", text: "AI Image Analyzer API loaded" },
                    { tone: "success", text: "Expected API methods available" },
                    { tone: watchedFiles.length > 0 ? "danger" : "neutral", text: watchedFiles.length > 0 ? "No watched test file accepted" : "No watched test file available" },
                ],
            };
        }

        return {
            tone: "success",
            value: "Ready",
            message: "",
            checks: [
                { tone: "success", text: "AI Image Analyzer API loaded" },
                { tone: "success", text: "Expected API methods available" },
                { tone: "success", text: "Watched test file accepted" },
            ],
        };
    }

    async checkOllama(): Promise<HealthCheckResult> {
        const selectedModel = this.plugin.settings.ollamaModel.trim() || DEFAULT_SETTINGS.ollamaModel;
        const response = await requestUrl({
            url: this.plugin.getOllamaTagsUrl(),
            method: "GET",
            throw: false,
        });
        if (response.status < 200 || response.status >= 300) {
            return {
                tone: "danger",
                value: "Failed",
                message: "",
                checks: [{ tone: "danger", text: `Ollama reachable: ${response.status}` }],
            };
        }
        const models = Array.isArray(response.json?.models)
            ? response.json.models.map((model: any) => model?.name).filter((name: unknown): name is string => typeof name === "string")
            : [];
        if (models.length === 0) {
            return {
                tone: "danger",
                value: "No models",
                message: "",
                checks: [
                    { tone: "success", text: "Ollama reachable" },
                    { tone: "danger", text: "Pulled models listed" },
                ],
            };
        }
        if (!models.includes(selectedModel)) {
            return {
                tone: "danger",
                value: "Model missing",
                message: "",
                checks: [
                    { tone: "success", text: "Ollama reachable" },
                    { tone: "success", text: "Pulled models listed" },
                    { tone: "danger", text: `${selectedModel} pulled` },
                ],
            };
        }
        return {
            tone: "success",
            value: "Ready",
            message: "",
            checks: [
                { tone: "success", text: "Ollama reachable" },
                { tone: "success", text: "Pulled models listed" },
                { tone: "success", text: `${selectedModel} pulled` },
            ],
        };
    }

    async checkReverseGeocode(): Promise<HealthCheckResult> {
        if (this.plugin.settings.geolocationProvider === "disabled") {
            return {
                tone: "neutral",
                value: "Off",
                message: "",
                checks: [{ tone: "neutral", text: "Reverse geocode provider selected" }],
            };
        }
        const data = await this.plugin.reverseGeocode({ latitude: 52.52, longitude: 13.405 });
        if (!data) {
            return {
                tone: "danger",
                value: "No data",
                message: "",
                checks: [
                    { tone: "success", text: "Reverse geocode provider selected" },
                    { tone: "danger", text: "Provider returned location data" },
                ],
            };
        }
        const providerName = this.plugin.settings.geolocationProvider === "local-nominatim" ? "Local Nominatim" : "Public Nominatim";
        const location = data.city || data.country || data.displayName || "test location";
        return {
            tone: this.plugin.settings.geolocationEnabled ? "success" : "neutral",
            value: this.plugin.settings.geolocationEnabled ? "Ready" : "Provider OK",
            message: "",
            checks: [
                { tone: "success", text: "Reverse geocode provider selected" },
                { tone: "success", text: `${providerName} answered for ${location}` },
                { tone: this.plugin.settings.geolocationEnabled ? "success" : "neutral", text: this.plugin.settings.geolocationEnabled ? "Geolocation Tags enabled" : "Geolocation Tags disabled" },
            ],
        };
    }

    renderHealthCheckupSettings(containerEl: HTMLElement): void {
        const cardRefs = this.renderHealthDashboardCards(containerEl, this.getHealthDashboardCards());
        const updateActiveImageStrip = this.renderActiveProcessingImageStrip(containerEl);
        if (this.activeSettingsSection === "health") {
            window.setTimeout(() => {
                if (containerEl.isConnected) {
                    updateActiveImageStrip();
                    void this.runAllHealthChecks(cardRefs);
                }
            }, 0);
            this.healthDashboardTimer = window.setInterval(() => {
                if (!containerEl.isConnected || this.activeSettingsSection !== "health") {
                    this.resetHealthDashboardTimer();
                    return;
                }
                this.updateHealthDashboardCards(cardRefs, true);
                updateActiveImageStrip();
            }, 1000);
        }
    }

    resetProcessingStatusTimer(): void {
        if (this.processingStatusTimer !== null) {
            window.clearInterval(this.processingStatusTimer);
            this.processingStatusTimer = null;
        }
    }

    resetHealthDashboardTimer(): void {
        if (this.healthDashboardTimer !== null) {
            window.clearInterval(this.healthDashboardTimer);
            this.healthDashboardTimer = null;
        }
    }

    renderProcessingLiveStatus(containerEl: HTMLElement): void {
        this.resetProcessingStatusTimer();
        const wrapper = containerEl.createDiv({ cls: "bfm-autotag-progress-notice bfm-autotag-processing-live-status" });
        const header = wrapper.createDiv({ cls: "bfm-autotag-progress-header" });
        header.createDiv({ cls: "bfm-autotag-progress-spinner" });
        const text = header.createDiv({ cls: "bfm-autotag-progress-text" });
        const titleEl = text.createDiv({ cls: "bfm-autotag-progress-title" });
        const subtitleEl = text.createDiv({ cls: "bfm-autotag-progress-subtitle" });

        const update = () => {
            if (!wrapper.isConnected) {
                this.resetProcessingStatusTimer();
                return;
            }
            const counts = this.plugin.getProcessingActivityCounts();
            const busy = this.plugin.isProcessingActivityActive();
            titleEl.setText(busy ? "Processing" : "Idle");
            subtitleEl.empty();
            if (busy) {
                subtitleEl.createSpan({ text: `Processing ${counts.completed}/${counts.total || counts.visible} Files` });
                const dotsEl = subtitleEl.createSpan({ cls: "bfm-autotag-loading-dots" });
                [0, 1, 2].forEach(() => dotsEl.createSpan({ text: "." }));
            } else {
                subtitleEl.setText("Queue idle");
            }
            wrapper.toggleClass("is-busy", busy);
            wrapper.toggleClass("is-complete", !busy);
        };

        update();
        this.processingStatusTimer = window.setInterval(update, 1000);
    }

    createSettingsAnchor(containerEl: HTMLElement, id: string, title: string): void {
        const heading = containerEl.createEl("h3", { text: title });
        heading.id = `bfm-autotag-${id}`;
        this.decorateHeadingWithIcon(heading, this.getSettingsSectionIcon(id));
    }

    findSettingItemByName(rootEl: HTMLElement, name: string): HTMLElement | null {
        const settingEls = Array.from(rootEl.querySelectorAll(".setting-item")) as HTMLElement[];
        return settingEls.find(settingEl => settingEl.querySelector(".setting-item-name")?.textContent?.trim() === name) ?? null;
    }

    moveHeadingGroup(sourceWrapper: HTMLElement | undefined, targetWrapper: HTMLElement | undefined, headingText: string): void {
        if (!sourceWrapper || !targetWrapper) return;
        const headings = Array.from(sourceWrapper.querySelectorAll("h4")) as HTMLElement[];
        const headingEl = headings.find(heading => heading.textContent?.trim() === headingText);
        if (!headingEl) return;
        let node: ChildNode | null = headingEl;
        while (node) {
            const next: ChildNode | null = node.nextSibling;
            targetWrapper.appendChild(node);
            node = next;
        }
    }

    moveSettingItemsByName(sourceWrapper: HTMLElement | undefined, targetWrapper: HTMLElement | undefined, names: string[]): void {
        if (!sourceWrapper || !targetWrapper) return;
        names.forEach(name => {
            const settingEl = this.findSettingItemByName(sourceWrapper, name);
            if (settingEl) targetWrapper.appendChild(settingEl);
        });
    }

    moveSettingRangeByName(sourceWrapper: HTMLElement | undefined, targetWrapper: HTMLElement | undefined, firstName: string, lastName: string): void {
        if (!sourceWrapper || !targetWrapper) return;
        const firstEl = this.findSettingItemByName(sourceWrapper, firstName);
        const lastEl = this.findSettingItemByName(sourceWrapper, lastName);
        if (!firstEl || !lastEl) return;

        let node: ChildNode | null = firstEl;
        while (node) {
            const next: ChildNode | null = node.nextSibling;
            targetWrapper.appendChild(node);
            if (node === lastEl) break;
            node = next;
        }
    }

    moveSettingWithFollowingDescriptions(sourceWrapper: HTMLElement | undefined, targetWrapper: HTMLElement | undefined, name: string): void {
        if (!sourceWrapper || !targetWrapper) return;
        const settingEl = this.findSettingItemByName(sourceWrapper, name);
        if (!settingEl) return;
        let node: ChildNode | null = settingEl;
        while (node) {
            const next: ChildNode | null = node.nextSibling;
            targetWrapper.appendChild(node);
            if (!(next instanceof HTMLElement) || next.matches(".setting-item, h3, h4")) break;
            node = next;
        }
    }

    appendSectionSubheading(targetWrapper: HTMLElement | undefined, title: string): void {
        if (!targetWrapper) return;
        const heading = document.createElement("h4");
        heading.setText(title);
        targetWrapper.appendChild(heading);
    }

    moveSettingRangeBeforeHeading(sourceWrapper: HTMLElement | undefined, targetWrapper: HTMLElement | undefined, firstName: string, lastName: string, headingText: string): void {
        if (!sourceWrapper || !targetWrapper) return;
        const firstEl = this.findSettingItemByName(sourceWrapper, firstName);
        const lastEl = this.findSettingItemByName(sourceWrapper, lastName);
        const targetHeading = (Array.from(targetWrapper.querySelectorAll("h4")) as HTMLElement[])
            .find(heading => heading.textContent?.trim() === headingText);
        if (!firstEl || !lastEl || !targetHeading) {
            this.moveSettingRangeByName(sourceWrapper, targetWrapper, firstName, lastName);
            return;
        }

        const movedNodes: ChildNode[] = [];
        let node: ChildNode | null = firstEl;
        while (node) {
            const next: ChildNode | null = node.nextSibling;
            movedNodes.push(node);
            if (node === lastEl) break;
            node = next;
        }
        movedNodes.forEach(movedNode => targetWrapper.insertBefore(movedNode, targetHeading));
    }

    wrapSubcategoryPanels(rootEl: HTMLElement): void {
        const headings = Array.from(rootEl.querySelectorAll("h4")) as HTMLElement[];
        headings.forEach(heading => {
            if (heading.parentElement?.hasClass("bfm-autotag-subcategory-panel")) return;
            const parent = heading.parentElement;
            if (!parent) return;
            const panel = document.createElement("div");
            panel.addClass("bfm-autotag-subcategory-panel");
            parent.insertBefore(panel, heading);

            let node: ChildNode | null = heading;
            while (node) {
                const next: ChildNode | null = node.nextSibling;
                panel.appendChild(node);
                if (next instanceof HTMLElement && next.matches("h3, h4")) break;
                node = next;
            }
        });
    }

    removeSettingRangeByName(sourceWrapper: HTMLElement | undefined, firstName: string, lastName: string): void {
        if (!sourceWrapper) return;
        const firstEl = this.findSettingItemByName(sourceWrapper, firstName);
        const lastEl = this.findSettingItemByName(sourceWrapper, lastName);
        if (!firstEl || !lastEl) return;

        let node: ChildNode | null = firstEl;
        while (node) {
            const next: ChildNode | null = node.nextSibling;
            node.parentNode?.removeChild(node);
            if (node === lastEl) break;
            node = next;
        }
    }

    getCleanSettingName(settingEl: HTMLElement): string {
        const nameEl = settingEl.querySelector(".setting-item-name") as HTMLElement | null;
        if (!nameEl) return "Unnamed setting";
        const clone = nameEl.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".bfm-autotag-info-trigger").forEach(el => el.remove());
        return clone.textContent?.trim() || "Unnamed setting";
    }

    getCleanSettingDescription(settingEl: HTMLElement): string {
        const descriptionEl = settingEl.querySelector(".setting-item-description") as HTMLElement | null;
        if (!descriptionEl) return "";
        const clone = descriptionEl.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".bfm-autotag-info-trigger, datalist").forEach(el => el.remove());
        return clone.textContent?.replace(/\s+/g, " ").trim() || "";
    }

    getSearchDescriptionExcerpt(description: string, query: string): string {
        const normalizedDescription = description.toLowerCase();
        const normalizedQuery = query.toLowerCase();
        const index = normalizedDescription.indexOf(normalizedQuery);
        if (index === -1) return "";
        const contextLength = 20;
        const start = Math.max(0, index - contextLength);
        const end = Math.min(description.length, index + query.length + contextLength);
        const prefix = start > 0 ? "..." : "";
        const suffix = end < description.length ? "..." : "";
        return `${prefix}${description.slice(start, end).trim()}${suffix}`;
    }

    createSettingsSearchSection(wrappers: Map<string, HTMLElement>): HTMLElement {
        const sections = this.getSettingsSections();
        const wrapper = document.createElement("div");
        wrapper.addClass("bfm-autotag-settings-section");
        wrapper.dataset.section = "search";
        const heading = wrapper.createEl("h3", { text: "Search" });
        heading.id = "bfm-autotag-search";

        const inputSetting = new Setting(wrapper)
            .setName("Search Settings")
            .setDesc("Searches names and description text across every settings tab.");
        let searchInput: HTMLInputElement;
        const resultsEl = wrapper.createDiv({ cls: "bfm-autotag-settings-search-results bfm-autotag-settings-search-results-list" });

        const allResults = () => Array.from(wrappers.entries())
            .filter(([sectionId]) => sectionId !== "search")
            .flatMap(([sectionId, sectionEl]) => {
                const section = sections.find(item => item.id === sectionId);
                const sectionLabel = section?.label ?? sectionId;
                const sectionIcon = section?.icon ?? "settings";
                return (Array.from(sectionEl.querySelectorAll(".setting-item")) as HTMLElement[]).map(settingEl => ({
                    sectionId,
                    sectionLabel,
                    sectionIcon,
                    name: this.getCleanSettingName(settingEl),
                    description: this.getCleanSettingDescription(settingEl),
                }));
            });

        const renderSearchResultButton = (
            result: ReturnType<typeof allResults>[number],
            descriptionExcerpt?: string
        ) => {
            const button = resultsEl.createEl("button", { cls: "bfm-autotag-settings-search-result" });
            button.type = "button";
            const iconEl = button.createSpan({ cls: "bfm-autotag-settings-search-result-icon" });
            setIcon(iconEl, result.sectionIcon);
            const textEl = button.createDiv({ cls: "bfm-autotag-settings-search-result-text" });
            textEl.createSpan({ text: result.name, cls: "bfm-autotag-settings-search-result-name" });
            textEl.createSpan({ text: ` - ${result.sectionLabel}`, cls: "bfm-autotag-settings-search-result-section" });
            if (descriptionExcerpt) {
                textEl.createDiv({ text: descriptionExcerpt, cls: "bfm-autotag-settings-search-result-excerpt" });
            }
            button.onclick = () => {
                this.activeSettingsSection = result.sectionId;
                this.display();
            };
        };
        const dedupeSearchResults = (items: ReturnType<typeof allResults>) => {
            const seen = new Set<string>();
            return items.filter(item => {
                const key = `${item.sectionId}\n${item.name.toLowerCase()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        };

        const renderResults = () => {
            const query = searchInput.value.trim().toLowerCase();
            this.settingsSearchQuery = searchInput.value;
            resultsEl.empty();
            if (!query) {
                return;
            }
            const results = allResults();
            const settingNameMatches = dedupeSearchResults(results.filter(result => result.name.toLowerCase().includes(query)));
            const descriptionMatches = dedupeSearchResults(results.filter(result =>
                !result.name.toLowerCase().includes(query)
                && result.description.toLowerCase().includes(query)
            ));
            if (settingNameMatches.length === 0 && descriptionMatches.length === 0) {
                resultsEl.createDiv({ text: "No matching settings found." });
                return;
            }
            if (settingNameMatches.length > 0) {
                resultsEl.createEl("h4", { text: "Setting Name Search Results:" });
                settingNameMatches.forEach(result => renderSearchResultButton(result));
            }
            if (descriptionMatches.length > 0) {
                resultsEl.createEl("h4", { text: "Description Search Results:" });
                descriptionMatches.forEach(result => renderSearchResultButton(result, this.getSearchDescriptionExcerpt(result.description, query)));
            }
        };

        inputSetting.addText(text => {
            searchInput = text.inputEl;
            this.attachTextSuggestions(text.inputEl, Array.from(new Set(allResults().map(result => result.name))));
            text.setPlaceholder("folder, ollama, duplicate, description...")
                .setValue(this.settingsSearchQuery)
                .onChange(() => renderResults());
        });
        renderResults();
        return wrapper;
    }

    organizeRenderedSettingsSections(containerEl: HTMLElement): void {
        const sectionOrder = this.getSettingsSections();
        const headings = Array.from(containerEl.querySelectorAll("h3[id^='bfm-autotag-']")) as HTMLElement[];
        const wrappers = new Map<string, HTMLElement>();

        headings.forEach(heading => {
            const id = heading.id.replace("bfm-autotag-", "");
            const wrapper = document.createElement("div");
            wrapper.addClass("bfm-autotag-settings-section");
            wrapper.dataset.section = id;

            let node: ChildNode | null = heading;
            while (node) {
                const next: ChildNode | null = node.nextSibling;
                wrapper.appendChild(node);
                if (next instanceof HTMLElement && next.matches("h3[id^='bfm-autotag-']")) break;
                node = next;
            }
            wrappers.set(id, wrapper);
        });

        this.moveHeadingGroup(wrappers.get("folder-tags"), wrappers.get("properties"), "Frontmatter");
        this.moveHeadingGroup(wrappers.get("qol"), wrappers.get("duplicates"), "Fix");
        this.moveSettingWithFollowingDescriptions(wrappers.get("qol"), wrappers.get("processing"), "Shutdown Protection");
        this.removeSettingRangeByName(wrappers.get("properties"), "Tags generated by AI", "Description generated by AI");
        this.removeSettingRangeByName(wrappers.get("duplicates"), "Filename Candidate Mode", "Folder Tags Candidate Mode");
        wrappers.set("search", this.createSettingsSearchSection(wrappers));
        wrappers.forEach(wrapper => this.wrapSubcategoryPanels(wrapper));
        wrappers.forEach(wrapper => this.decorateSettingsHeadings(wrapper));

        const contentEl = containerEl.createDiv({ cls: "bfm-autotag-settings-tab-content" });
        sectionOrder.forEach(section => {
            const wrapper = wrappers.get(section.id);
            if (!wrapper) return;
            wrapper.toggleClass("is-active", section.id === this.activeSettingsSection);
            if (section.id !== this.activeSettingsSection) wrapper.hide();
            contentEl.appendChild(wrapper);
        });
    }
    forceSettingsBodyOpen(containerEl: HTMLElement): void {
        containerEl.style.display = "";
        containerEl.style.height = "";
        containerEl.style.maxHeight = "none";
        containerEl.style.overflow = "";
        containerEl.style.opacity = "";
        containerEl.style.transform = "";
        const bodyEls = Array.from(containerEl.querySelectorAll(".bfm-autotag-animated-section-body")) as HTMLElement[];
        bodyEls.forEach(bodyEl => {
            bodyEl.style.display = "";
            bodyEl.style.height = "";
            bodyEl.style.maxHeight = "none";
            bodyEl.style.overflow = "";
            bodyEl.style.opacity = "1";
            bodyEl.style.transform = "translateY(0)";
            bodyEl.addClass("is-open");
        });
    }
    renderAiGeneratedPropertySettings(containerEl: HTMLElement): void {
        containerEl.createEl("h4", { text: "AI Properties" });
        new Setting(containerEl)
            .setName("Tags generated by AI")
            .setDesc("Property used for AI-generated tags. Notice: Empty Fallback to Default.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiTagsPropertyEnabled)
                .onChange(async value => {
                    this.plugin.settings.aiTagsPropertyEnabled = value;
                    await this.plugin.saveSettings();
                }))
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getPropertyNameSuggestions());
                text.setPlaceholder(DEFAULT_SETTINGS.aiTagsPropertyName)
                    .setValue(this.plugin.settings.aiTagsPropertyName)
                    .onChange(async value => {
                        this.plugin.settings.aiTagsPropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.aiTagsPropertyName);
                        await this.plugin.saveSettings();
                        if (this.plugin.settings.aiTagsUseAsVaultCandidate) this.plugin.buildVaultVocabularyCache();
                    });
            });

        new Setting(containerEl)
            .setName("Use as Vault Awareness Candidates")
            .setDesc("Allows values written to the AI tags property to become known vocabulary for Vault Awareness.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiTagsUseAsVaultCandidate)
                .onChange(async value => {
                    this.plugin.settings.aiTagsUseAsVaultCandidate = value;
                    await this.plugin.saveSettings();
                    this.plugin.buildVaultVocabularyCache();
                }));


        const aiTagsFormatSetting = new Setting(containerEl)
            .setName("AI tag format")
            .setDesc("Controls how each generated AI tag is written into the YAML list.");
        const aiTagsFormatPreview = aiTagsFormatSetting.controlEl.createDiv();
        const refreshAiTagsFormatPreview = () => {
            this.renderFormatPreview(aiTagsFormatPreview, "Preview", this.plugin.settings.aiTagsFormat, "info");
        };
        refreshAiTagsFormatPreview();
        aiTagsFormatSetting.addText(text => text
            .setPlaceholder("[[example]]")
            .setValue(this.plugin.settings.aiTagsFormat)
            .onChange(async value => {
                this.plugin.settings.aiTagsFormat = value;
                refreshAiTagsFormatPreview();
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName("Description generated by AI")
            .setDesc("Property used for the AI-generated image description. Notice: Empty Fallback to Default.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiDescriptionPropertyEnabled)
                .onChange(async value => {
                    this.plugin.settings.aiDescriptionPropertyEnabled = value;
                    await this.plugin.saveSettings();
                }))
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getPropertyNameSuggestions());
                text.setPlaceholder(DEFAULT_SETTINGS.aiDescriptionPropertyName)
                    .setValue(this.plugin.settings.aiDescriptionPropertyName)
                    .onChange(async value => {
                        this.plugin.settings.aiDescriptionPropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.aiDescriptionPropertyName);
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Use Geolocation to enhance Description")
            .setDesc("When Geolocation Tags are enabled and GPS data is available, Autotag uses the known location metadata to correct or avoid guessed location claims in the AI description.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useGeolocationForAiDescription)
                .onChange(async value => {
                    this.plugin.settings.useGeolocationForAiDescription = value;
                    await this.plugin.saveSettings();
                }));
    }

    renderAiCandidateModeSettings(containerEl: HTMLElement): void {
        containerEl.createEl("h4", { text: "Candidate Modes" });
        new Setting(containerEl)
            .setName("Filename Candidate Mode")
            .setDesc("Controls whether words from the image file name are used for AI tags.")
            .addDropdown(dropdown => dropdown
                .addOption("disabled", "Disabled")
                .addOption("consider", "Consider")
                .addOption("all", "All Keywords")
                .addOption("exclude", "Exclude")
                .setValue(this.plugin.settings.filenameCandidateMode)
                .onChange(async (value) => {
                    this.plugin.settings.filenameCandidateMode = value as CandidateMode;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName("Folder Tags Candidate Mode")
            .setDesc("Controls whether enabled folder-derived keywords are used for AI tags. Exclude prevents current folder-derived terms from being written to aitags, even if they appear through another route.")
            .addDropdown(dropdown => dropdown
                .addOption("disabled", "Disabled")
                .addOption("consider", "Consider")
                .addOption("all", "All Keywords")
                .addOption("exclude", "Exclude")
                .setValue(this.plugin.settings.folderTagsCandidateMode)
                .onChange(async (value) => {
                    this.plugin.settings.folderTagsCandidateMode = value as CandidateMode;
                    await this.plugin.saveSettings();
                }));
    }

    renderAiEnabledSettings(containerEl: HTMLElement): void {
        containerEl.empty();
        if (!this.plugin.settings.aiTaggingEnabled) return;
        const aiBodyEl = this.createSettingsRevealContainer(containerEl);
        aiBodyEl.createEl("h4", { text: "AI Setup" });

        new Setting(aiBodyEl)
            .setName("Get Ollama")
            .setDesc("Required for local AI tagging. Install Ollama before pulling or using local models.")
            .addButton(button => {
                button
                    .setButtonText("Download Ollama")
                    .onClick(() => {
                        window.open("https://ollama.com/download");
                    });
                button.buttonEl.addClass("bfm-autotag-success-button");
            });

        const modelSetting = new Setting(aiBodyEl)
            .setName("Ollama Model")
            .setDesc("Local model used for semantic enrichment.");

        let refreshModelDropdown: (() => Promise<void>) | null = null;

        modelSetting.addDropdown(dropdown => {
            refreshModelDropdown = async () => {
                const pulledModels = await this.plugin.listPulledOllamaModels();
                const pulledSet = new Set(pulledModels);

                dropdown.selectEl.empty();

                RECOMMENDED_TAGGING_MODELS.forEach(model => {
                    const suffix = pulledSet.has(model.name) ? " [Pulled]" : "";
                    dropdown.addOption(model.name, `${model.label}${suffix}`);
                });

                pulledModels
                    .filter(model => !RECOMMENDED_TAGGING_MODELS.some(recommended => recommended.name === model))
                    .forEach(model => dropdown.addOption(model, `${model} [Pulled]`));

                dropdown.setValue(this.plugin.settings.ollamaModel || "qwen3:8b");
            };

            RECOMMENDED_TAGGING_MODELS.forEach(model => {
                dropdown.addOption(model.name, model.label);
            });

            dropdown
                .setValue(this.plugin.settings.ollamaModel || "qwen3:8b")
                .onChange(async (value) => {
                    this.plugin.settings.ollamaModel = value;
                    await this.plugin.saveSettings();
                });

            void refreshModelDropdown();
        });

        new Setting(aiBodyEl)
            .setName("Pull Selected Model")
            .setDesc("Downloads the selected model with Ollama so it can be used locally. Ollama must be installed and running first.")
            .addButton(button => {
                button
                    .setButtonText("Pull Model")
                    .setCta()
                    .onClick(async () => {
                        const modelName = this.plugin.settings.ollamaModel || "qwen3:8b";
                        button.setButtonText("Pulling...");
                        button.setDisabled(true);

                        const pulled = await this.plugin.pullOllamaModel(modelName);

                        button.setDisabled(false);
                        button.setButtonText("Pull Model");

                        if (pulled) {
                            new Notice(`Pulled Ollama model: ${modelName}`);
                            await refreshModelDropdown?.();
                        } else {
                            new Notice("Could not pull model. Check that Ollama is installed and running.");
                        }
                    });
            });

        new Setting(aiBodyEl)
            .setName("Remove Selected Model")
            .setDesc("Deletes the selected model from local Ollama storage.")
            .addButton(button => {
                const removeSelectedModel = async () => {
                    const modelName = this.plugin.settings.ollamaModel || "qwen3:8b";
                    button.setButtonText("Removing...");
                    button.setDisabled(true);

                    const removed = await this.plugin.removeOllamaModel(modelName);

                    button.setDisabled(false);
                    button.setButtonText("Remove Model");

                    if (removed) {
                        new Notice(`Removed Ollama model: ${modelName}`);
                        await refreshModelDropdown?.();
                    } else {
                        new Notice("Could not remove model. Check that Ollama is running and the model is pulled.");
                    }
                };

                button
                    .setButtonText("Remove Model")
                    .onClick(() => {
                        const modelName = this.plugin.settings.ollamaModel || "qwen3:8b";
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Remove selected Ollama model?",
                            `This deletes '${modelName}' from local Ollama storage. It does not change existing notes.`,
                            "Remove Model",
                            removeSelectedModel
                        ).open();
                    });
                button.buttonEl.addClass("bfm-autotag-danger-button");
            });

        new Setting(aiBodyEl)
            .setName("Ollama Local URL")
            .setDesc("Local Ollama server on this computer. Install Ollama first if this is not running yet. Notice: Empty Fallback to Default.")
            .addText(text =>
                text.setPlaceholder(DEFAULT_SETTINGS.ollamaBaseUrl)
                    .setValue(this.plugin.settings.ollamaBaseUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.ollamaBaseUrl = value.trim() || DEFAULT_SETTINGS.ollamaBaseUrl;
                        await this.plugin.saveSettings();
                    }));

        new Setting(aiBodyEl)
            .setName("Custom Ollama Model")
            .setDesc("Optional: type a model name not listed above, for example a custom Modelfile name.")
            .addText(text =>
                text.setPlaceholder("my-custom-model")
                    .setValue("")
                    .onChange(async (value) => {
                        const modelName = value.trim();
                        if (modelName) {
                            this.plugin.settings.ollamaModel = modelName;
                            await this.plugin.saveSettings();
                        }
                    }));

        new Setting(aiBodyEl)
            .setName("Ollama generated Tags Cap")
            .setDesc("Maximum aitags written from Ollama. Notice: Empty Fallback to Default. Notice: 0 means Infinite, so use caution.")
            .addText(text => text
                .setPlaceholder("100")
                .setValue(String(this.plugin.settings.ollamaGeneratedTagsCap))
                .onChange(async (value) => {
                    const parsed = Number(value.trim());
                    this.plugin.settings.ollamaGeneratedTagsCap = Number.isFinite(parsed) && parsed >= 0
                        ? Math.round(parsed)
                        : DEFAULT_SETTINGS.ollamaGeneratedTagsCap;
                    await this.plugin.saveSettings();

                    if (this.plugin.settings.ollamaGeneratedTagsCap === 0) {
                        new Notice("Ollama generated tags cap is Infinite. Use caution.");
                    }
                }));

        this.renderAiGeneratedPropertySettings(aiBodyEl);
        this.renderAiCandidateModeSettings(aiBodyEl);
        this.wrapSubcategoryPanels(aiBodyEl);
        this.decorateSettingsHeadings(aiBodyEl);
        this.enhanceInfoDescriptionAnimations(aiBodyEl);
    }
    enhanceInfoDescriptionAnimations(containerEl: HTMLElement): void {
        const settingEls = Array.from(containerEl.querySelectorAll(".setting-item")) as HTMLElement[];
        settingEls.forEach(settingEl => {
            const nameEl = settingEl.querySelector(".setting-item-name") as HTMLElement | null;
            const descriptionEl = settingEl.querySelector(".setting-item-description") as HTMLElement | null;
            if (!nameEl || !descriptionEl || nameEl.querySelector(".bfm-autotag-info-trigger")) return;

            const infoEl = nameEl.createSpan({ cls: "bfm-autotag-info-trigger", text: "i" });
            let desiredOpen = false;
            let isAnimating = false;
            let isOpen = false;
            let isNameHovered = false;
            let isInfoHovered = false;
            let isDescriptionHovered = false;
            let lastPointer: { x: number; y: number } | null = null;
            const duration = 420;

            const closeOtherDescriptions = () => {
                const controllers = Array.from(this.containerEl.querySelectorAll(".setting-item"))
                    .map(el => (el as any).__bfmAutotagInfoController)
                    .filter(Boolean);
                controllers.forEach(controller => {
                    if (controller.settingEl !== settingEl) controller.close();
                });
            };

            const animateTo = (open: boolean) => {
                if (isAnimating || isOpen === open) return;
                isAnimating = true;
                descriptionEl.addClass("bfm-autotag-info-managed");
                descriptionEl.style.overflow = "hidden";
                descriptionEl.style.display = "block";
                descriptionEl.style.maxHeight = open ? "0px" : `${descriptionEl.scrollHeight}px`;
                descriptionEl.style.opacity = open ? "0" : "1";
                descriptionEl.style.marginTop = open ? "0" : "4px";
                descriptionEl.style.transform = open ? "translateY(-2px)" : "translateY(0)";
                descriptionEl.style.pointerEvents = open ? "auto" : "none";

                window.requestAnimationFrame(() => {
                    descriptionEl.style.transition = `max-height ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${duration}ms ease, margin-top ${duration}ms ease, transform ${duration}ms ease`;
                    descriptionEl.style.maxHeight = open ? `${descriptionEl.scrollHeight}px` : "0px";
                    descriptionEl.style.opacity = open ? "1" : "0";
                    descriptionEl.style.marginTop = open ? "4px" : "0";
                    descriptionEl.style.transform = open ? "translateY(0)" : "translateY(-2px)";
                });

                window.setTimeout(() => {
                    isAnimating = false;
                    isOpen = open;
                    if (open) {
                        descriptionEl.style.maxHeight = "none";
                        descriptionEl.style.pointerEvents = "auto";
                    } else {
                        descriptionEl.style.pointerEvents = "none";
                    }
                    if (open && desiredOpen) {
                        window.requestAnimationFrame(() => {
                            if (!isHoverStillActive()) requestState(false);
                        });
                    }
                    if (desiredOpen !== isOpen) {
                        animateTo(desiredOpen);
                    }
                }, duration + 40);
            };

            const requestState = (open: boolean) => {
                if (open) closeOtherDescriptions();
                desiredOpen = open;
                if (!isAnimating) animateTo(open);
            };

            (settingEl as any).__bfmAutotagInfoController = {
                settingEl,
                close: () => requestState(false),
            };

            const rememberPointer = (event: MouseEvent) => {
                lastPointer = { x: event.clientX, y: event.clientY };
            };
            const isPointerInExpandedSafetyZone = (): boolean => {
                if (!lastPointer || !isAnimating || !desiredOpen || isOpen) return false;
                const settingRect = settingEl.getBoundingClientRect();
                const descriptionRect = descriptionEl.getBoundingClientRect();
                const missingHeight = Math.max(0, descriptionEl.scrollHeight - descriptionRect.height);
                const safetyBottom = settingRect.bottom + missingHeight + 12;
                return lastPointer.x >= settingRect.left - 4
                    && lastPointer.x <= settingRect.right + 4
                    && lastPointer.y >= settingRect.top - 6
                    && lastPointer.y <= safetyBottom;
            };
            const isHoverStillActive = (): boolean => isNameHovered
                || isInfoHovered
                || isDescriptionHovered
                || nameEl.matches(":hover")
                || infoEl.matches(":hover")
                || descriptionEl.matches(":hover")
                || infoEl.matches(":focus");
            const requestCloseAfterGrace = (event?: MouseEvent | FocusEvent) => window.setTimeout(() => {
                if (event instanceof MouseEvent) rememberPointer(event);
                if (!isHoverStillActive() && !isPointerInExpandedSafetyZone()) requestState(false);
            }, 100);
            nameEl.addEventListener("mouseenter", event => { isNameHovered = true; rememberPointer(event); requestState(true); });
            nameEl.addEventListener("mousemove", rememberPointer);
            nameEl.addEventListener("mouseleave", event => { isNameHovered = false; requestCloseAfterGrace(event); });
            infoEl.addEventListener("mouseenter", event => { isInfoHovered = true; rememberPointer(event); requestState(true); });
            infoEl.addEventListener("mousemove", rememberPointer);
            infoEl.addEventListener("mouseleave", event => { isInfoHovered = false; requestCloseAfterGrace(event); });
            infoEl.addEventListener("focus", () => requestState(true));
            descriptionEl.addEventListener("mouseenter", event => {
                isDescriptionHovered = true;
                rememberPointer(event);
                requestState(true);
            });
            descriptionEl.addEventListener("mousemove", rememberPointer);
            descriptionEl.addEventListener("mouseleave", event => {
                isDescriptionHovered = false;
                requestCloseAfterGrace(event);
            });
            infoEl.addEventListener("blur", requestCloseAfterGrace);
            infoEl.tabIndex = 0;
            infoEl.setAttribute("role", "button");
            infoEl.setAttribute("aria-label", "Show description");
        });
    }
    scrollSettingsToTop(): void {
        const candidates = new Set<HTMLElement>();
        let parent = this.containerEl.parentElement;
        while (parent) {
            candidates.add(parent);
            parent = parent.parentElement;
        }
        document.querySelectorAll(
            ".vertical-tab-content, .vertical-tab-content-container, .modal-content, .community-modal-readme, .workspace-leaf-content, .view-content, .setting-tab-container"
        ).forEach(el => candidates.add(el as HTMLElement));

        candidates.forEach(el => {
            try {
                el.scrollTop = 0;
                el.scrollTo({ top: 0, behavior: "smooth" });
            } catch (_) {
                el.scrollTop = 0;
            }
        });

        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
        document.body.scrollTo({ top: 0, behavior: "smooth" });
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    openSection(sectionId: string): void {
        const sectionExists = this.getSettingsSections().some(section => section.id === sectionId);
        this.activeSettingsSection = sectionExists ? sectionId : "health";
        this.display();
        window.setTimeout(() => this.scrollSettingsToTop(), 0);
    }

    display(): void {
        this.plugin.buildVaultVocabularyCache();
        const { containerEl } = this;
        this.closeInfoDescriptions(containerEl);
        this.resetInfoScrollCloseHandlers();
        this.resetProcessingStatusTimer();
        this.resetHealthDashboardTimer();
        containerEl.empty();
        containerEl.addClass("bfm-autotag-settings-tab");

        containerEl.createEl('h2', { text: 'Maru\'s Autotag Settings' });
        this.renderSettingsNavigation(containerEl);
        this.createSettingsAnchor(containerEl, "health", "Health");
        this.renderHealthCheckupSettings(containerEl);

        this.createSettingsAnchor(containerEl, "setup", "Setup");
        this.renderHowItWorksPanel(
            containerEl,
            "How it works",
            "Install the Binary File Manager plugin so it can create companion notes. Maru\'s Autotag then goes through every tag system and follows its instructions in the order shown here in the settings.",
            true
        );
        containerEl.createEl("h4", { text: "Path Setup" });

        // Base path
        new Setting(containerEl)
            .setName("Base Path for Watched Files")
            .setDesc("Relative path inside the vault to watch for files. Notice: Empty Fallback to Default.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getFolderPathSuggestions());
                text.setPlaceholder(DEFAULT_SETTINGS.basePath)
                    .setValue(this.plugin.settings.basePath)
                    .onChange(async (value) => {
                        this.plugin.settings.basePath = value.trim() || DEFAULT_SETTINGS.basePath;
                        await this.plugin.saveSettings();
                        //new Notice("Updated Ata base path.");
                    });
            });

        // BFM new file location

        new Setting(containerEl)
            .setName("BFM New File Location")
            .setDesc("Where BFM creates the note corresponding to the watched file. Notice: Empty Fallback to Default.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getFolderPathSuggestions());
                text.setPlaceholder(DEFAULT_SETTINGS.bfmNewFileLocation)
                    .setValue(this.plugin.settings.bfmNewFileLocation)
                    .onChange(async (value) => {
                        this.plugin.settings.bfmNewFileLocation = value.trim() || DEFAULT_SETTINGS.bfmNewFileLocation;
                        await this.plugin.saveSettings();
                        //new Notice("Updated BFM folder location.");
                    });
            });

        new Setting(containerEl)
            .setName("BFM File name format")
            .setDesc("Use the same metadata filename format as Binary File Manager. Supported: {{NAME}}, {{FULLNAME}}, {{EXTENSION}}, {{PATH}}, {{LINK}}, {{EMBED}}, plus :UP and :LOW. Tip: for dates as properties, use created/last modified properties with a linter plugin. Notice: Empty Fallback to Default.")
            .addText(text => text
                .setPlaceholder(DEFAULT_SETTINGS.bfmFileNameFormat)
                .setValue(this.plugin.settings.bfmFileNameFormat)
                .onChange(async value => {
                    this.plugin.settings.bfmFileNameFormat = value.trim() || DEFAULT_SETTINGS.bfmFileNameFormat;
                    await this.plugin.saveSettings();
                }));

        this.renderSettingsProfileSettings(containerEl);

        this.createSettingsAnchor(containerEl, "properties", "Properties");
        let generatedMarkdownPreviewHostEl: HTMLElement | null = null;
        let templatePropertySuggestionHostEl: HTMLElement | null = null;
        const refreshGeneratedMarkdownPreview = () => {
            if (generatedMarkdownPreviewHostEl) {
                this.renderGeneratedMarkdownPreview(generatedMarkdownPreviewHostEl, true);
            }
        };
        const refreshTemplatePropertySuggestions = () => {
            if (templatePropertySuggestionHostEl) {
                this.renderTemplatePropertySuggestionBox(templatePropertySuggestionHostEl, true);
            }
        };
        containerEl.createEl("h4", { text: "Plugin Properties" });

        new Setting(containerEl)
            .setName("Link to file property name")
            .setDesc("Property used for the link to the original image file. Notice: Empty Fallback to Default.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.linkToFilePropertyEnabled)
                .onChange(async value => {
                    this.plugin.settings.linkToFilePropertyEnabled = value;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }))
            .addText(text => {
                text.setPlaceholder(DEFAULT_SETTINGS.linkToFilePropertyName)
                    .setValue(this.plugin.settings.linkToFilePropertyName)
                    .onChange(async value => {
                        this.plugin.settings.linkToFilePropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.linkToFilePropertyName);
                        await this.plugin.saveSettings();
                        refreshTemplatePropertySuggestions();
                        refreshGeneratedMarkdownPreview();
                    });
            });

        new Setting(containerEl)
            .setName("File type property name")
            .setDesc("Property used for the source file extension. Notice: Empty Fallback to Default.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.fileTypePropertyEnabled)
                .onChange(async value => {
                    this.plugin.settings.fileTypePropertyEnabled = value;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }))
            .addText(text => {
                text.setPlaceholder(DEFAULT_SETTINGS.fileTypePropertyName)
                    .setValue(this.plugin.settings.fileTypePropertyName)
                    .onChange(async value => {
                        this.plugin.settings.fileTypePropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.fileTypePropertyName);
                        await this.plugin.saveSettings();
                        refreshTemplatePropertySuggestions();
                        refreshGeneratedMarkdownPreview();
                    });
            });

        new Setting(containerEl)
            .setName("Embed property name")
            .setDesc("Property used for the embedded source file link. Notice: Empty Fallback to Default.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.embedPropertyEnabled)
                .onChange(async value => {
                    this.plugin.settings.embedPropertyEnabled = value;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }))
            .addText(text => {
                text.setPlaceholder(DEFAULT_SETTINGS.embedPropertyName)
                    .setValue(this.plugin.settings.embedPropertyName)
                    .onChange(async value => {
                        this.plugin.settings.embedPropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.embedPropertyName);
                        await this.plugin.saveSettings();
                        refreshTemplatePropertySuggestions();
                        refreshGeneratedMarkdownPreview();
                    });
            });

        new Setting(containerEl)
            .setName("Tags generated by AI")
            .setDesc("Property used for AI-generated tags. Notice: Empty Fallback to Default.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiTagsPropertyEnabled)
                .onChange(async value => {
                    this.plugin.settings.aiTagsPropertyEnabled = value;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }))
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getPropertyNameSuggestions());
                text.setPlaceholder(DEFAULT_SETTINGS.aiTagsPropertyName)
                    .setValue(this.plugin.settings.aiTagsPropertyName)
                    .onChange(async value => {
                        this.plugin.settings.aiTagsPropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.aiTagsPropertyName);
                        await this.plugin.saveSettings();
                        if (this.plugin.settings.aiTagsUseAsVaultCandidate) this.plugin.buildVaultVocabularyCache();
                        refreshTemplatePropertySuggestions();
                        refreshGeneratedMarkdownPreview();
                    });
            });

        new Setting(containerEl)
            .setName("Use as Vault Awareness Candidates")
            .setDesc("Allows values written to the AI tags property to become known vocabulary for Vault Awareness.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiTagsUseAsVaultCandidate)
                .onChange(async value => {
                    this.plugin.settings.aiTagsUseAsVaultCandidate = value;
                    await this.plugin.saveSettings();
                    this.plugin.buildVaultVocabularyCache();
                }));


        const aiTagsFormatSetting = new Setting(containerEl)
            .setName("AI tag format")
            .setDesc("Controls how each generated AI tag is written into the YAML list.");
        const aiTagsFormatPreview = aiTagsFormatSetting.controlEl.createDiv();
        const refreshAiTagsFormatPreview = () => {
            this.renderFormatPreview(aiTagsFormatPreview, "Preview", this.plugin.settings.aiTagsFormat, "info");
        };
        refreshAiTagsFormatPreview();
        aiTagsFormatSetting.addText(text => text
            .setPlaceholder("[[example]]")
            .setValue(this.plugin.settings.aiTagsFormat)
            .onChange(async value => {
                this.plugin.settings.aiTagsFormat = value;
                refreshAiTagsFormatPreview();
                await this.plugin.saveSettings();
                refreshGeneratedMarkdownPreview();
            }));

        new Setting(containerEl)
            .setName("Description generated by AI")
            .setDesc("Property used for the AI-generated image description. Notice: Empty Fallback to Default.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiDescriptionPropertyEnabled)
                .onChange(async value => {
                    this.plugin.settings.aiDescriptionPropertyEnabled = value;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }))
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getPropertyNameSuggestions());
                text.setPlaceholder(DEFAULT_SETTINGS.aiDescriptionPropertyName)
                    .setValue(this.plugin.settings.aiDescriptionPropertyName)
                    .onChange(async value => {
                        this.plugin.settings.aiDescriptionPropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.aiDescriptionPropertyName);
                        await this.plugin.saveSettings();
                        refreshTemplatePropertySuggestions();
                        refreshGeneratedMarkdownPreview();
                    });
            });


        const detectedProperties = this.getDetectedFrontmatterProperties();

        this.createSettingsAnchor(containerEl, "folder-tags", "Folder Tags");
        const folderTagsHowHostEl = containerEl.createDiv();
        const renderFolderTagsHow = () => {
            folderTagsHowHostEl.empty();
            if (this.plugin.settings.useFolderTags) return;
            this.renderHowItWorksPanel(
                folderTagsHowHostEl,
                "How Folder Tags work",
                "Dropping a file into the Base Path adds properties based on Folder Properties, with tags based on subfolder names. Example: a file inside Anime/Character can write Anime and Character. Folder Tags may also be used as candidates for AI Tags to generate more nuanced and varied AI tags."
            );
        };
        renderFolderTagsHow();

        new Setting(containerEl)
            .setName("Enable Folder Tags")
            .setDesc("Uses folder names for Property Lists, fallback frontmatter values, and AI tag candidates. Turn off to prevent folder terms from being written or sent as candidates.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useFolderTags)
                .onChange(async value => {
                    this.plugin.settings.useFolderTags = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        this.animateSettingsCollapseThenRender(folderTagsHowHostEl, renderFolderTagsHow);
                        this.animateSettingsContent(folderTagsHostEl, renderFolderTagsEnabled);
                    } else {
                        this.animateSettingsContent(folderTagsHowHostEl, renderFolderTagsHow);
                        this.animateSettingsCollapseThenRender(folderTagsHostEl, renderFolderTagsEnabled);
                    }
                }));

        const folderTagsHostEl = containerEl.createDiv();
        const renderFolderTagsEnabled = () => {
            folderTagsHostEl.empty();
            if (!this.plugin.settings.useFolderTags) return;
            const folderTagsBodyEl = this.createSettingsRevealContainer(folderTagsHostEl);
            this.renderFolderPropertyLists(folderTagsBodyEl, detectedProperties);

            folderTagsBodyEl.createEl("h4", { text: "Fallback" });
            const fallbackPanelEl = folderTagsBodyEl.createDiv({ cls: "bfm-autotag-property-panel" });
            fallbackPanelEl.createEl("h5", { text: "Folder Fallback" });
            new Setting(fallbackPanelEl)
                .setName("Folder Fallback Property")
                .setDesc("Where folder names go when they are not listed above as domains or types. The dropdown is built from frontmatter properties already found in the vault. Default autotag-fallback keeps new installs neutral until the user chooses their own property. Notice: Empty Fallback to Default.")
                .addDropdown(dropdown => {
                    Array.from(new Set([...detectedProperties, this.plugin.settings.folderFallbackProperty]))
                        .filter(Boolean)
                        .sort((a, b) => a.localeCompare(b))
                        .forEach(property => dropdown.addOption(property, property));
                    dropdown
                        .setValue(this.plugin.settings.folderFallbackProperty)
                        .onChange(async (value) => {
                            this.plugin.settings.folderFallbackProperty = this.plugin.normalizeFolderFallbackProperty(value);
                            await this.plugin.saveSettings();
                            if (this.plugin.settings.folderFallbackUseAsVaultCandidate) this.plugin.buildVaultVocabularyCache();
                        });
                })
                .addButton(button => button
                    .setButtonText("Refresh")
                    .setTooltip("Refresh detected properties")
                    .onClick(() => this.refreshDisplayAnimated()));

            const fallbackFormatSetting = new Setting(fallbackPanelEl)
                .setName("Folder fallback format")
                .setDesc("Controls how unmatched folder names are written into the fallback YAML list.");
            const fallbackFormatPreview = fallbackFormatSetting.controlEl.createDiv();
            const refreshFallbackFormatPreview = () => {
                this.renderFormatPreview(fallbackFormatPreview, "Preview", this.plugin.settings.folderFallbackFormat, "info");
            };
            refreshFallbackFormatPreview();
            fallbackFormatSetting.addText(text => text
                .setPlaceholder("[[example]]")
                .setValue(this.plugin.settings.folderFallbackFormat)
                .onChange(async value => {
                    this.plugin.settings.folderFallbackFormat = value;
                    refreshFallbackFormatPreview();
                    await this.plugin.saveSettings();
                }));

            new Setting(fallbackPanelEl)
                .setName("Use fallback as AI candidates")
                .setDesc("Allows unmatched folder names written to the fallback property to be used by Folder Tags Candidate Mode.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.folderFallbackUseAsAiCandidate)
                    .onChange(async value => {
                        this.plugin.settings.folderFallbackUseAsAiCandidate = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(fallbackPanelEl)
                .setName("Use as Vault Awareness Candidates")
                .setDesc("Allows values written to the fallback property to become known vocabulary for Vault Awareness.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.folderFallbackUseAsVaultCandidate)
                    .onChange(async value => {
                        this.plugin.settings.folderFallbackUseAsVaultCandidate = value;
                        await this.plugin.saveSettings();
                        this.plugin.buildVaultVocabularyCache();
                    }));

            fallbackPanelEl.createEl("p", {
                text: "Fallback values are written as a YAML list. To rename this property later across many generated notes, use Obsidian's Properties view rename feature, or search for 'autotag-fallback:' and replace it with your chosen property name.",
                cls: "setting-item-description",
            });
        };
        renderFolderTagsEnabled();
        if (this.plugin.settings.useFolderTags) this.forceSettingsBodyOpen(folderTagsHostEl);
        containerEl.createEl("h4", { text: "Frontmatter" });
        new Setting(containerEl)
            .setName("Template Source")
            .setDesc("Choose whether Maru\'s Autotag builds the companion note from its own template or enriches a note created by BFM Templater. Note: even when Autotag Internal Template is selected, Binary File Manager may still use Templater before Autotag replaces the note content later in processing.")
            .addDropdown(dropdown => dropdown
                .addOption("internal", "Use Autotag Internal Template")
                .addOption("bfm-templater", "Use BFM Templater Integration")
                .setValue(this.plugin.settings.templateSource)
                .onChange(async value => {
                    this.plugin.settings.templateSource = value as TemplateSource;
                    await this.plugin.saveSettings();
                    this.animateSettingsContent(templateSourceHostEl, renderTemplateSourceSettings);
                    refreshTemplatePropertySuggestions();
                    refreshGeneratedMarkdownPreview();
                }));

        const templateSourceHostEl = containerEl.createDiv();
        const renderTemplateSourceSettings = () => {
            templateSourceHostEl.empty();
            templatePropertySuggestionHostEl = null;
            if (this.plugin.settings.templateSource === "internal") {
                const frontmatterTemplateSetting = new Setting(templateSourceHostEl)
                    .setName("Frontmatter Template")
                    .setDesc("Paste a valid frontmatter template from one of your notes. Generated properties such as linktofile, filetype, embed, aitags, and aidescription overwrite their template values. Property-list values and extra template properties are additive/preserved, so examples like types: with - Ata or tags: with - excalidraw can stay in the template.");
                templatePropertySuggestionHostEl = frontmatterTemplateSetting.infoEl.createDiv({ cls: "bfm-autotag-template-suggestion-host" });
                this.renderTemplatePropertySuggestionBox(templatePropertySuggestionHostEl);
                frontmatterTemplateSetting.addTextArea(textArea => {
                    textArea.inputEl.rows = 12;
                    textArea.setPlaceholder(DEFAULT_SETTINGS.frontmatterTemplate)
                        .setValue(this.plugin.settings.frontmatterTemplate)
                        .onChange(async (value) => {
                            this.plugin.settings.frontmatterTemplate = value;
                            await this.plugin.saveSettings();
                            refreshTemplatePropertySuggestions();
                            refreshGeneratedMarkdownPreview();
                        });
                });

                templateSourceHostEl.createEl("p", {
                    text: "Tip: define or adjust property types in Obsidian before bulk processing if you want values to paste in as lists, text, links, or checkboxes consistently. Obsidian usually keeps a property's type until you change it again.",
                    cls: "setting-item-description",
                });
            } else {
                templateSourceHostEl.createEl("p", {
                    text: "BFM Templater mode expects Binary File Manager to create the companion note from its own template first. In BFM settings, enable its Templater integration and set the template file location there. Maru\'s Autotag then reads the created note, overwrites generated properties, adds property-list values, and preserves the rest.",
                    cls: "setting-item-description",
                });
                templatePropertySuggestionHostEl = templateSourceHostEl.createDiv({ cls: "bfm-autotag-template-suggestion-host" });
                this.renderTemplatePropertySuggestionBox(templatePropertySuggestionHostEl);
            }
            this.enhanceInfoDescriptionAnimations(templateSourceHostEl);
        };
        renderTemplateSourceSettings();
        this.forceSettingsBodyOpen(templateSourceHostEl);

        new Setting(containerEl)
            .setName("Paste image embed into note body")
            .setDesc("Adds the image embed below the frontmatter as ![[image]].")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.writeImageEmbedInBody)
                .onChange(async value => {
                    this.plugin.settings.writeImageEmbedInBody = value;
                    await this.plugin.saveSettings();
                    refreshGeneratedMarkdownPreview();
                }));

        generatedMarkdownPreviewHostEl = containerEl.createDiv();
        this.renderGeneratedMarkdownPreview(generatedMarkdownPreviewHostEl);

        this.renderGeolocationSettings(containerEl);

        this.createSettingsAnchor(containerEl, 'processing', 'Processing & Queue');

        containerEl.createEl("h4", { text: "Processing Setup" });

        new Setting(containerEl)
            .setName("Parallel workers")
            .setDesc("How many dropped files to process at the same time. Higher values use more CPU and memory.")
            .addSlider(slider => slider
                .setLimits(1, 16, 1)
                .setValue(this.plugin.settings.parallelWorkers)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.parallelWorkers = value;
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setIcon("rotate-ccw")
                .setTooltip("Reset to default")
                .onClick(async () => {
                    this.plugin.settings.parallelWorkers = DEFAULT_SETTINGS.parallelWorkers;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));

        new Setting(containerEl)
            .setName("BFM note max wait")
            .setDesc("Maximum seconds to wait for Binary File Manager to create the companion note before processing.")
            .addSlider(slider => slider
                .setLimits(1, 30, 1)
                .setValue(Math.round(this.plugin.settings.bfmNoteMaxWaitMs / 1000))
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.bfmNoteMaxWaitMs = value * 1000;
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setIcon("rotate-ccw")
                .setTooltip("Reset to default")
                .onClick(async () => {
                    this.plugin.settings.bfmNoteMaxWaitMs = DEFAULT_SETTINGS.bfmNoteMaxWaitMs;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));

        new Setting(containerEl)
            .setName("Bulk drop max wait")
            .setDesc("When multiple files are dropped quickly, keep collecting them for up to this many seconds before starting.")
            .addSlider(slider => slider
                .setLimits(1, 30, 1)
                .setValue(Math.round(this.plugin.settings.queueBatchMaxWaitMs / 1000))
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.queueBatchMaxWaitMs = value * 1000;
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setIcon("rotate-ccw")
                .setTooltip("Reset to default")
                .onClick(async () => {
                    this.plugin.settings.queueBatchMaxWaitMs = DEFAULT_SETTINGS.queueBatchMaxWaitMs;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));

        this.createSettingsAnchor(containerEl, 'duplicates', 'Duplicates');

        const duplicateUnlinkedHashCount = this.plugin.getUnlinkedDuplicateRecords().length;
        const duplicateUnhashedFileCount = this.plugin.getUnhashedFiles().length;
        const duplicateUnpairedFileCount = this.plugin.getUnpairedFiles().length;

        containerEl.createEl("h4", { text: "Duplicate Setup" });

        const addDuplicateActionOptions = (dropdown: import('obsidian').DropdownComponent) => dropdown
            .addOption("ask", "Ask")
            .addOption("process", "Process anyway")
            .addOption("delete-new-pair", "Delete new duplicate pair")
            .addOption("replace-original-keep-original", "Replace original, keep original paths")
            .addOption("replace-original-keep-new", "Replace original, keep new location");

        new Setting(containerEl)
            .setName("Duplicate detection mode")
            .setDesc("Exact uses SHA-256 file hashes. Exact + visual also checks a small perceptual image hash for possible resized or recompressed duplicates.")
            .addDropdown(dropdown => dropdown
                .addOption("off", "Off")
                .addOption("exact", "Exact only")
                .addOption("exact-visual", "Exact + visual similarity")
                .setValue(this.plugin.settings.duplicateDetectionMode)
                .onChange(async value => {
                    this.plugin.settings.duplicateDetectionMode = value as DuplicateDetectionMode;
                    await this.plugin.saveSettings();
                    this.animateSettingsContent(duplicateModeHostEl, renderDuplicateModeSettings);
                }));

        const duplicateModeHostEl = containerEl.createDiv();
        const renderDuplicateModeSettings = () => {
            duplicateModeHostEl.empty();
            if (this.plugin.settings.duplicateDetectionMode === "off") return;

            new Setting(duplicateModeHostEl)
                .setName("Exact duplicate action")
                .setDesc("What to do when the file content hash exactly matches an already processed file.")
                .addDropdown(dropdown => {
                    addDuplicateActionOptions(dropdown);
                    dropdown
                        .setValue(this.plugin.settings.exactDuplicateAction)
                        .onChange(async value => {
                            this.plugin.settings.exactDuplicateAction = value as DuplicateAction;
                            await this.plugin.saveSettings();
                        });
                });

            if (this.plugin.settings.duplicateDetectionMode === "exact-visual") {
                new Setting(duplicateModeHostEl)
                    .setName("Visual duplicate action")
                    .setDesc("What to do when the image looks similar but is not byte-identical.")
                    .addDropdown(dropdown => {
                        addDuplicateActionOptions(dropdown);
                        dropdown
                            .setValue(this.plugin.settings.visualDuplicateAction)
                            .onChange(async value => {
                                this.plugin.settings.visualDuplicateAction = value as DuplicateAction;
                                await this.plugin.saveSettings();
                            });
                    });

                new Setting(duplicateModeHostEl)
                    .setName("Visual similarity threshold")
                    .setDesc("Maximum perceptual-hash distance treated as a possible duplicate. Lower is stricter.")
                    .addSlider(slider => slider
                        .setLimits(0, 32, 1)
                        .setValue(this.plugin.settings.visualDuplicateThreshold)
                        .setDynamicTooltip()
                        .onChange(async value => {
                            this.plugin.settings.visualDuplicateThreshold = value;
                            await this.plugin.saveSettings();
                        }))
                    .addButton(button => button
                        .setIcon("rotate-ccw")
                        .setTooltip("Reset to default")
                        .onClick(async () => {
                            this.plugin.settings.visualDuplicateThreshold = DEFAULT_SETTINGS.visualDuplicateThreshold;
                            await this.plugin.saveSettings();
                            this.animateSettingsContent(duplicateModeHostEl, renderDuplicateModeSettings);
                        }));
            }

            new Setting(duplicateModeHostEl)
                .setName("Migrate old links on replace")
                .setDesc("When a replace action keeps one version and removes the other, rewrite markdown wiki links from the removed image/note paths to the kept paths.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.duplicateMigrateLinksOnReplace)
                    .onChange(async value => {
                        this.plugin.settings.duplicateMigrateLinksOnReplace = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(duplicateModeHostEl)
                .setName("Autorename after Replacing Old Duplicate")
                .setDesc("Duplicates may have a 1 (same image same folder) or CONFLICT (same image other folder) in back or front. These will also be detected. Autorenaming them is encouraged.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.duplicateAutorenameOnReplace)
                    .onChange(async value => {
                        this.plugin.settings.duplicateAutorenameOnReplace = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(duplicateModeHostEl)
                .setName("Wait for duplicate source to finish")
                .setDesc("When on, the duplicate popup waits for your decision before normal processing continues, which can save processing power. When off, the duplicate popup still opens, the duplicate keeps processing while the popup is open, and the popup refreshes its status and companion-note details until your action is applied.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.waitForDuplicateSourceProcessing)
                    .onChange(async value => {
                        this.plugin.settings.waitForDuplicateSourceProcessing = value;
                        await this.plugin.saveSettings();
                    }));
            this.enhanceInfoDescriptionAnimations(duplicateModeHostEl);
        };
        renderDuplicateModeSettings();
        if (this.plugin.settings.duplicateDetectionMode !== "off") this.forceSettingsBodyOpen(duplicateModeHostEl);

        new Setting(containerEl)
            .setName("Filename Candidate Mode")
            .setDesc("Controls whether words from the image file name are used for AI tags.")
            .addDropdown(dropdown => dropdown
                .addOption("disabled", "Disabled")
                .addOption("consider", "Consider")
                .addOption("all", "All Keywords")
                .addOption("exclude", "Exclude")
                .setValue(this.plugin.settings.filenameCandidateMode)
                .onChange(async (value) => {
                    this.plugin.settings.filenameCandidateMode = value as CandidateMode;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName("Folder Tags Candidate Mode")
            .setDesc("Controls whether enabled folder-derived keywords are used for AI tags. Exclude prevents current folder-derived terms from being written to aitags, even if they appear through another route.")
            .addDropdown(dropdown => dropdown
                .addOption("disabled", "Disabled")
                .addOption("consider", "Consider")
                .addOption("all", "All Keywords")
                .addOption("exclude", "Exclude")
                .setValue(this.plugin.settings.folderTagsCandidateMode)
                .onChange(async (value) => {
                    this.plugin.settings.folderTagsCandidateMode = value as CandidateMode;
                    await this.plugin.saveSettings();
                }));

        this.createSettingsAnchor(containerEl, 'vault-awareness', 'Vault Awareness');
        const vaultHowHostEl = containerEl.createDiv();
        const renderVaultHow = () => {
            vaultHowHostEl.empty();
            if (this.plugin.settings.vaultAwarenessEnabled) return;
            this.renderHowItWorksPanel(
                vaultHowHostEl,
                "How Vault Awareness works",
                "When enabled, Autotag scans configured frontmatter properties for known concepts and lets Ollama add fitting existing vault vocabulary after the base AI tags. This keeps personal vocabulary available without forcing unrelated terms."
            );
        };
        renderVaultHow();

        new Setting(containerEl)
            .setName("Enable Vault Awareness")
            .setDesc("Adds a second Ollama pass that may select fitting known concepts from your configured vault vocabulary.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.vaultAwarenessEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.vaultAwarenessEnabled = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        this.animateSettingsCollapseThenRender(vaultHowHostEl, renderVaultHow);
                        this.animateSettingsContent(vaultHostEl, renderVaultEnabled);
                    } else {
                        this.animateSettingsContent(vaultHowHostEl, renderVaultHow);
                        this.animateSettingsCollapseThenRender(vaultHostEl, renderVaultEnabled);
                    }
                }));

        const vaultHostEl = containerEl.createDiv();
        const renderVaultEnabled = () => {
            vaultHostEl.empty();
            if (!this.plugin.settings.vaultAwarenessEnabled) return;
            const vaultBodyEl = this.createSettingsRevealContainer(vaultHostEl);
            vaultBodyEl.createEl("h4", { text: "Vault Setup" });

            new Setting(vaultBodyEl)
                .setName("Hide linguistic features for Vault Awareness")
                .setDesc("Keeps the detailed linguistic feature controls collapsed. The saved feature settings still apply.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.hideVaultLinguisticFeatures)
                    .onChange(async value => {
                        this.plugin.settings.hideVaultLinguisticFeatures = value;
                        await this.plugin.saveSettings();
                        if (value) {
                            this.animateSettingsCollapseThenRender(vaultLinguisticsHostEl, renderVaultLinguistics);
                        } else {
                            this.animateSettingsContent(vaultLinguisticsHostEl, renderVaultLinguistics);
                        }
                    }));
            const vaultLinguisticsHostEl = vaultBodyEl.createDiv();
            const renderVaultLinguistics = () => this.renderLinguisticFeatureSubsection(vaultLinguisticsHostEl, "vault");
            renderVaultLinguistics();
            if (!this.plugin.settings.hideVaultLinguisticFeatures) this.forceSettingsBodyOpen(vaultLinguisticsHostEl);

            new Setting(vaultBodyEl)
                .setName("Max Vault-Aware Additions")
                .setDesc("Maximum known vault concepts added by the vault-awareness pass.")
                .addSlider(slider => slider
                    .setLimits(1, 100, 1)
                    .setValue(this.plugin.settings.maxVaultAwareAdditions)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.maxVaultAwareAdditions = value;
                        await this.plugin.saveSettings();
                    }))
                .addButton(button => button
                    .setIcon("rotate-ccw")
                    .setTooltip("Reset to default")
                    .onClick(async () => {
                        this.plugin.settings.maxVaultAwareAdditions = DEFAULT_SETTINGS.maxVaultAwareAdditions;
                        await this.plugin.saveSettings();
                        this.refreshDisplayAnimated();
                    }));
            new Setting(vaultBodyEl)
                .setName("Max Prompt Vocabulary")
                .setDesc("Maximum ranked vault concepts sent to the tagging model as candidates.")
                .addSlider(slider => slider
                    .setLimits(5, 300, 5)
                    .setValue(this.plugin.settings.maxPromptVocabularyTerms)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.maxPromptVocabularyTerms = value;
                        await this.plugin.saveSettings();
                    }))
                .addButton(button => button
                    .setIcon("rotate-ccw")
                    .setTooltip("Reset to default")
                    .onClick(async () => {
                        this.plugin.settings.maxPromptVocabularyTerms = DEFAULT_SETTINGS.maxPromptVocabularyTerms;
                        await this.plugin.saveSettings();
                        this.refreshDisplayAnimated();
                    }));

            vaultBodyEl.createEl("h4", { text: "Vault Awareness Candidates" });
            const candidatePanelEl = vaultBodyEl.createDiv({ cls: "bfm-autotag-property-panel bfm-autotag-vault-candidates-panel" });
            candidatePanelEl.createEl("h5", { text: "Candidate Sources" });
            new Setting(candidatePanelEl)
                .setName("Excluded Candidate Terms")
                .setDesc("Terms that should never be sent as vault vocabulary candidates, comma separated.")
                .addTextArea(textArea => {
                    textArea.setPlaceholder(DEFAULT_SETTINGS.excludedVocabularyTerms.join(', '));
                    textArea.setValue(this.plugin.settings.excludedVocabularyTerms.join(', '));
                    textArea.onChange(async (value) => {
                        this.plugin.settings.excludedVocabularyTerms = value
                            .split(',')
                            .map(term => term.trim())
                            .filter(Boolean);
                        await this.plugin.saveSettings();
                        this.plugin.buildVaultVocabularyCache();
                    });
                });

            const candidateProperties = this.plugin.getVaultAwarenessCandidateProperties();
            candidatePanelEl.createEl("p", {
                text: candidateProperties.length > 0
                    ? "Properties currently used as Vault Awareness vocabulary sources:"
                    : "No properties are currently used as Vault Awareness vocabulary sources. Enable the Vault Awareness candidate toggles under Folder Tags or Tags generated by AI.",
                cls: "setting-item-description",
            });
            const candidateListEl = candidatePanelEl.createDiv({ cls: "bfm-autotag-vault-candidate-list" });
            candidateProperties.forEach(property => {
                candidateListEl.createSpan({ text: property, cls: "bfm-autotag-vault-candidate-chip" });
            });
            if (this.plugin.settings.bridgeEnabled && this.plugin.settings.bridgeUsePreBridgeVaultAwarenessOutput) {
                candidateListEl.createSpan({ text: "Setting: Pre-Bridge", cls: "bfm-autotag-vault-candidate-chip bfm-autotag-vault-candidate-chip-setting" });
            }

            vaultBodyEl.createEl("h4", { text: "Vault Awareness Output" });
            const outputPanelEl = vaultBodyEl.createDiv({ cls: "bfm-autotag-property-panel bfm-autotag-vault-output-panel" });
            outputPanelEl.createEl("h5", { text: "Recognized Vault Tags" });
            outputPanelEl.createEl("p", {
                text: "By default, recognized Vault Awareness tags feed back into AI Tags. Enable separate output to also route those recognized vault tags into another property.",
                cls: "setting-item-description",
            });

            let outputFieldsHostEl: HTMLElement;
            const renderVaultAwarenessOutputFields = () => {
                outputFieldsHostEl.empty();
                if (!this.plugin.settings.vaultAwarenessOutputEnabled) return;
                const outputFieldsEl = this.createSettingsRevealContainer(outputFieldsHostEl);
                const availableProperties = Array.from(new Set([
                    ...this.getPropertyNameSuggestions(),
                    this.plugin.settings.vaultAwarenessOutputPropertyName,
                    DEFAULT_SETTINGS.vaultAwarenessOutputPropertyName,
                ])).filter(Boolean).sort((a, b) => a.localeCompare(b));

                new Setting(outputFieldsEl)
                    .setName("Vault Awareness Tags Property")
                    .setDesc("Property that receives recognized Vault Awareness tags when separate output is enabled.")
                    .addDropdown(dropdown => {
                        availableProperties.forEach(property => dropdown.addOption(property, property));
                        dropdown
                            .setValue(this.plugin.settings.vaultAwarenessOutputPropertyName)
                            .onChange(async value => {
                                this.plugin.settings.vaultAwarenessOutputPropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.vaultAwarenessOutputPropertyName);
                                await this.plugin.saveSettings();
                            });
                    });

                const outputFormatSetting = new Setting(outputFieldsEl)
                    .setName("Vault Awareness Tags Format")
                    .setDesc("Controls how recognized vault tags are written into the selected YAML list.");
                const outputFormatPreviewEl = outputFormatSetting.controlEl.createDiv();
                const refreshOutputFormatPreview = () => {
                    this.renderFormatPreview(outputFormatPreviewEl, "Preview", this.plugin.settings.vaultAwarenessOutputFormat, "info");
                };
                refreshOutputFormatPreview();
                outputFormatSetting.addText(text => text
                    .setPlaceholder("[[example]]")
                    .setValue(this.plugin.settings.vaultAwarenessOutputFormat)
                    .onChange(async value => {
                        this.plugin.settings.vaultAwarenessOutputFormat = value;
                        refreshOutputFormatPreview();
                        await this.plugin.saveSettings();
                    }));

                new Setting(outputFieldsEl)
                    .setName("Exclusive Vault Awareness Output")
                    .setDesc("When enabled, recognized Vault Awareness tags are written only to the selected property and are kept out of AI Tags. When disabled, they are written to both places.")
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.vaultAwarenessOutputExclusive)
                        .onChange(async value => {
                            this.plugin.settings.vaultAwarenessOutputExclusive = value;
                            await this.plugin.saveSettings();
                        }));
            };

            new Setting(outputPanelEl)
                .setName("Write Vault Awareness Tags separately")
                .setDesc("Adds recognized Vault Awareness tags to a separate property without replacing existing template values.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.vaultAwarenessOutputEnabled)
                    .onChange(async value => {
                        this.plugin.settings.vaultAwarenessOutputEnabled = value;
                        await this.plugin.saveSettings();
                        if (value) {
                            this.animateSettingsContent(outputFieldsHostEl, renderVaultAwarenessOutputFields);
                        } else {
                            this.animateSettingsCollapseThenRender(outputFieldsHostEl, renderVaultAwarenessOutputFields);
                        }
                    }));
            outputFieldsHostEl = outputPanelEl.createDiv();
            renderVaultAwarenessOutputFields();
            if (this.plugin.settings.vaultAwarenessOutputEnabled) this.forceSettingsBodyOpen(outputFieldsHostEl);
            this.wrapSubcategoryPanels(vaultBodyEl);
            this.enhanceInfoDescriptionAnimations(vaultBodyEl);
        };
        renderVaultEnabled();
        if (this.plugin.settings.vaultAwarenessEnabled) this.forceSettingsBodyOpen(vaultHostEl);
        this.createSettingsAnchor(containerEl, "ai-tags", "AI Tags");
        const aiTagsHowHostEl = containerEl.createDiv();
        const renderAiTagsHow = () => {
            aiTagsHowHostEl.empty();
            if (this.plugin.settings.aiTaggingEnabled) return;
            this.renderHowItWorksPanel(
                aiTagsHowHostEl,
                "How AI Tags work",
                "When enabled, Autotag sends the image description to a local Ollama model and writes semantic tags into the configured AI tag property. This can improve searchability with concepts that are not directly present in the folder path."
            );
            this.renderSoftWarningPanel(
                aiTagsHowHostEl,
                "AI Tagging can take longer",
                "Using Ollama for tagging can significantly increase file generation time, potentially up to 1 minute per file depending on your computer and selected model."
            );
        };
        renderAiTagsHow();

        new Setting(containerEl)
            .setName("Enable AI Tagging via Ollama")
            .setDesc("Use a local Ollama model to turn the AI image description into semantic aitags.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiTaggingEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.aiTaggingEnabled = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        this.animateSettingsCollapseThenRender(aiTagsHowHostEl, renderAiTagsHow);
                        this.animateSettingsContent(aiTagsHostEl, renderAiTagsEnabled);
                    } else {
                        this.animateSettingsContent(aiTagsHowHostEl, renderAiTagsHow);
                        this.animateSettingsCollapseThenRender(aiTagsHostEl, renderAiTagsEnabled);
                    }
                }));

        const aiTagsHostEl = containerEl.createDiv({ cls: "bfm-autotag-ai-enabled-host" });
        const renderAiTagsEnabled = () => {
            this.renderAiEnabledSettings(aiTagsHostEl);
            this.enhanceInfoDescriptionAnimations(aiTagsHostEl);
        };
        renderAiTagsEnabled();
        if (this.plugin.settings.aiTaggingEnabled) this.forceSettingsBodyOpen(aiTagsHostEl);
        this.createSettingsAnchor(containerEl, "bridge", "Bridge");
        const bridgeHowHostEl = containerEl.createDiv();
        const renderBridgeHow = () => {
            bridgeHowHostEl.empty();
            if (this.plugin.settings.bridgeEnabled) return;
            this.renderHowItWorksPanel(
                bridgeHowHostEl,
                "How Bridge Enrichment works",
                "Bridge adds your own concept relationships during AI tagging. Subject Bridge rules connect source concepts to target concepts, such as House => Architecture. Manual Enrichment rules add extra related tags from an already generated tag, such as Castle => Fortress."
            );
        };
        renderBridgeHow();

        new Setting(containerEl)
            .setName("Enable Bridge Enrichment")
            .setDesc("Applies your personal bridge and enrichment rules during AI tagging. This can add intentional related concepts before Vault Awareness sees the generated tags.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.bridgeEnabled)
                .onChange(async value => {
                    this.plugin.settings.bridgeEnabled = value;
                    await this.plugin.saveSettings();
                    if (value) {
                        this.animateSettingsCollapseThenRender(bridgeHowHostEl, renderBridgeHow);
                        this.animateSettingsContent(bridgeHostEl, renderBridgeEnabled);
                    } else {
                        this.animateSettingsContent(bridgeHowHostEl, renderBridgeHow);
                        this.animateSettingsCollapseThenRender(bridgeHostEl, renderBridgeEnabled);
                    }
                }));

        const bridgeHostEl = containerEl.createDiv();
        const renderBridgeEnabled = () => {
            bridgeHostEl.empty();
            if (!this.plugin.settings.bridgeEnabled) return;
            const bridgeBodyEl = this.createSettingsRevealContainer(bridgeHostEl);
            bridgeBodyEl.createEl("h4", { text: "Bridge Setup" });

            new Setting(bridgeBodyEl)
                .setName("Hide linguistic features for Bridge Enrichment")
                .setDesc("Keeps the detailed linguistic feature controls collapsed. The saved feature settings still apply.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.hideBridgeLinguisticFeatures)
                    .onChange(async value => {
                        this.plugin.settings.hideBridgeLinguisticFeatures = value;
                        await this.plugin.saveSettings();
                        if (value) {
                            this.animateSettingsCollapseThenRender(bridgeLinguisticsHostEl, renderBridgeLinguistics);
                        } else {
                            this.animateSettingsContent(bridgeLinguisticsHostEl, renderBridgeLinguistics);
                        }
                    }));
            const bridgeLinguisticsHostEl = bridgeBodyEl.createDiv();
            const renderBridgeLinguistics = () => this.renderLinguisticFeatureSubsection(bridgeLinguisticsHostEl, "bridge");
            renderBridgeLinguistics();
            if (!this.plugin.settings.hideBridgeLinguisticFeatures) this.forceSettingsBodyOpen(bridgeLinguisticsHostEl);

            new Setting(bridgeBodyEl)
                .setName("Manual Subject Bridge Enrichment Rules")
                .setDesc("One rule per line. If any left-side source concept is recognized, the right-side target concepts are added as intentional bridge tags. Example: House, Structure => Architecture. These rules are best for stable personal concept routes, not loose associations.")
                .addTextArea(textArea => {
                    textArea.inputEl.rows = 5;
                    textArea.setPlaceholder("House, Structure, Bridge => Architecture\nCartoon => Anime, Drawing")
                        .setValue(this.plugin.settings.manualSubjectBridgeRules)
                        .onChange(async (value) => {
                            this.plugin.settings.manualSubjectBridgeRules = value;
                            await this.plugin.saveSettings();
                        });
                });

            new Setting(bridgeBodyEl)
                .setName("Use Pre-Bridge Terms in Vault Awareness Output")
                .setDesc("When Vault Awareness writes to a separate output property, include bridge-related terms that were part of the bridge route, not only the term selected by Vault Awareness. Example: with House => Architecture, this can allow House to appear beside Architecture in the Vault Awareness output. Turn off to write only the basic Vault Awareness selections.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.bridgeUsePreBridgeVaultAwarenessOutput)
                    .onChange(async value => {
                        this.plugin.settings.bridgeUsePreBridgeVaultAwarenessOutput = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(bridgeBodyEl)
                .setName("Manual Enrichment Rules")
                .setDesc("One rule per line. If the generated tag on the left appears, add the right-side terms as extra AI tags. Example: Castle => Fortress, Stronghold, Architecture. These are direct expansions of generated tags and do not recursively chain.")
                .addTextArea(textArea => {
                    textArea.inputEl.rows = 5;
                    textArea.setPlaceholder("Castle => Fortress, Stronghold, Architecture\nSword => Weapon")
                        .setValue(this.plugin.settings.manualEnrichmentRules)
                        .onChange(async (value) => {
                            this.plugin.settings.manualEnrichmentRules = value;
                            await this.plugin.saveSettings();
                        });
                });
            this.wrapSubcategoryPanels(bridgeBodyEl);
            this.enhanceInfoDescriptionAnimations(bridgeBodyEl);
        };
        renderBridgeEnabled();
        if (this.plugin.settings.bridgeEnabled) this.forceSettingsBodyOpen(bridgeHostEl);
        this.createSettingsAnchor(containerEl, 'qol', 'Quality of Life');

        containerEl.createEl("h4", { text: "Companion Notes" });

        new Setting(containerEl)
            .setName("Shutdown Protection")
            .setDesc(this.plugin.settings.shutdownProtectionEnabled
                ? "Files in the queue are logged and can be resumed after restart. Performance drain is negligible compared to AI tagging, depending on file amount."
                : "Warning: When turned off, queued or in-progress processing is not logged and will be lost on shutdown or reload.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.shutdownProtectionEnabled)
                .onChange(async value => {
                    this.plugin.settings.shutdownProtectionEnabled = value;
                    if (!value) {
                        this.plugin.settings.protectedJobs = [];
                    }
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));

        containerEl.createEl('p', {
            text: this.plugin.settings.shutdownProtectionEnabled
                ? `${this.plugin.settings.protectedJobs.length} unfinished file${this.plugin.settings.protectedJobs.length === 1 ? "" : "s"} currently logged for resume.`
                : "Enable this if you want Autotag to resume unfinished queued files after an Obsidian reload or shutdown.",
            cls: 'setting-item-description',
        });

        new Setting(containerEl)
            .setName("Auto-process unprocessed files on reload")
            .setDesc("When enabled, Autotag scans the Base Path after reload and queues watched files that are not already marked processed. Default is off so reloads stay quiet unless you choose a vault-wide catch-up run.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoProcessUnprocessedOnReload)
                .onChange(async value => {
                    this.plugin.settings.autoProcessUnprocessedOnReload = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Create missing companion note")
            .setDesc("If Binary File Manager does not create the companion note after the configured retry attempts, Autotag creates the expected note itself and continues processing.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.createMissingCompanionNote)
                .onChange(async value => {
                    this.plugin.settings.createMissingCompanionNote = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Delete File that did not get a Companion Note")
            .setDesc("Even after retry, if enabled, Autotag deletes source images that still have no companion note after BFM and Autotag both had a chance to create one. Counter of lonely deleted images: " + this.plugin.settings.lonelyDeletedImageCount)
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.deleteLonelyFileWithoutCompanion)
                .onChange(async value => {
                    this.plugin.settings.deleteLonelyFileWithoutCompanion = value;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));

        new Setting(containerEl)
            .setName("Delete linked image/note pair")
            .setDesc("When an image or its companion note is deleted, also delete the linked counterpart and stop queued processing for both. For smoother pair deletion, set Obsidian Settings > Files and links > Delete attachments when deleting files to Never. Turning this off still cleans queue/hash state for the deleted file itself.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.deleteLinkedFilePair)
                .onChange(async value => {
                    this.plugin.settings.deleteLinkedFilePair = value;
                    await this.plugin.saveSettings();
                }));


        this.renderClearDropdownExcludedProperties(containerEl);
        this.renderLimitedFileTypeWarningSettings(containerEl);
        containerEl.createEl('h4', { text: 'Fix' });
        const duplicateWarningLines: string[] = [];
        if (duplicateUnhashedFileCount > 0) {
            duplicateWarningLines.push(`${duplicateUnhashedFileCount} file${duplicateUnhashedFileCount === 1 ? "" : "s"} under the watched base path do not have duplicate hashes yet. Use Regenerate hashes for all files, Copy unhashed file paths, or Move affected Files.`);
        }
        if (duplicateUnlinkedHashCount > 0) {
            duplicateWarningLines.push(`${duplicateUnlinkedHashCount} duplicate hash record${duplicateUnlinkedHashCount === 1 ? "" : "s"} point to missing files. Use Copy unlinked hash details, Move affected Files, or Delete unlinked hashes.`);
        }
        if (duplicateUnpairedFileCount > 0) {
            duplicateWarningLines.push(`${duplicateUnpairedFileCount} pairable file${duplicateUnpairedFileCount === 1 ? "" : "s"} are not paired. Use Manual Pairing, Copy unpaired file paths, Delete unpaired files, or Move affected Files.`);
        }
        this.renderAttentionWarningPanel(containerEl, "bfm-autotag-duplicate-cleanup-warning", "Duplicate cleanup attention", duplicateWarningLines);

        new Setting(containerEl)
            .setName("Enable Duplicate Protection")
            .setDesc("Uses file hashes to detect duplicates before AI processing. Turning this off stops duplicate checks but keeps existing hash records until you delete or regenerate them.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useDuplicateProtection)
                .onChange(async value => {
                    this.plugin.settings.useDuplicateProtection = value;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));

        new Setting(containerEl)
            .setName("Regenerate hashes for all files")
            .setDesc("Rebuilds duplicate hashes for files currently under the watched base path.")
            .addButton(button => button
                .setButtonText("Regenerate Hashes")
                .onClick(async () => {
                    button.setDisabled(true);
                    button.setButtonText("Regenerating...");
                    await this.plugin.regenerateDuplicateHashes();
                    button.setDisabled(false);
                    button.setButtonText("Regenerate Hashes");
                    this.refreshDisplayAnimated();
                }));

        new Setting(containerEl)
            .setName("Copy unhashed file paths")
            .setDesc(`${duplicateUnhashedFileCount} file${duplicateUnhashedFileCount === 1 ? "" : "s"} under the watched base path currently have no duplicate hash record.`)
            .addButton(button => button
                .setButtonText("Copy Paths")
                .onClick(async () => {
                    await this.plugin.copyUnhashedFilesToClipboard();
                }));
        this.renderMoveAffectedFilesSetting(
            containerEl,
            "Choose a vault folder and move source files that currently have no duplicate hash record there.",
            "Unhashed Files",
            "unhashed file",
            () => this.plugin.getUnhashedFiles()
        );

        new Setting(containerEl)
            .setName("Copy unlinked hash details")
            .setDesc(`${duplicateUnlinkedHashCount} duplicate hash record${duplicateUnlinkedHashCount === 1 ? "" : "s"} point to a missing image or companion note.`)
            .addButton(button => button
                .setButtonText("Copy Details")
                .onClick(async () => {
                    await this.plugin.copyUnlinkedHashesToClipboard();
                }));
        this.renderMoveAffectedFilesSetting(
            containerEl,
            "Choose a vault folder and move existing files that belong to unlinked duplicate hash records there.",
            "Unlinked Hashes",
            "unlinked hash file",
            () => this.plugin.getUnlinkedHashAffectedFiles()
        );

        new Setting(containerEl)
            .setName("Delete unlinked hashes")
            .setDesc(`${duplicateUnlinkedHashCount} unlinked duplicate hash record${duplicateUnlinkedHashCount === 1 ? "" : "s"} can be deleted.`)
            .addButton(button => {
                button
                    .setButtonText("Delete Unlinked")
                    .setWarning()
                    .onClick(() => {
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Delete unlinked hashes?",
                            `This removes ${duplicateUnlinkedHashCount} duplicate hash record${duplicateUnlinkedHashCount === 1 ? "" : "s"} that point to missing files. Existing files and notes are not deleted.`,
                            "Delete Unlinked",
                            async () => {
                                await this.plugin.deleteUnlinkedHashes();
                                this.refreshDisplayAnimated();
                            }
                        ).open();
                    });
                button.buttonEl.addClass("bfm-autotag-danger-button");
            });

        const normalizeLookupPath = (value: string): string => value
            .trim()
            .replace(/\\/g, "/")
            .replace(/^[a-z]:/i, "")
            .replace(/^\/+/, "")
            .toLowerCase();
        const matchesPairPath = (storedPath: string | undefined, query: string): boolean => {
            if (!storedPath) return false;
            const stored = normalizeLookupPath(storedPath);
            const normalizedQuery = normalizeLookupPath(query);
            return stored.includes(normalizedQuery) || normalizedQuery.endsWith(stored);
        };

        containerEl.createEl("h4", { text: "Search" });
        let pairLookupByFileText = "Enter part of an image or companion path to find its pair ID.";
        let pairLookupByFilePairId = "";
        let pairLookupByFileResult: HTMLElement;
        const updatePairLookupByFile = (value: string) => {
            const query = value.trim();
            if (!query) {
                pairLookupByFileText = "Enter part of an image or companion path to find its pair ID.";
                pairLookupByFilePairId = "";
                pairLookupByFileResult.setText(pairLookupByFileText);
                return;
            }
            const record = this.plugin.getPairRecords().find(pair =>
                matchesPairPath(pair.imagePath, query)
                || matchesPairPath(pair.notePath, query)
            );
            pairLookupByFilePairId = record?.pairId ?? "";
            pairLookupByFileText = record
                ? `Pair ID: ${record.pairId}`
                : "No pair record found for that filename/path.";
            pairLookupByFileResult.setText(pairLookupByFileText);
        };
        new Setting(containerEl)
            .setName("Search filename for Pair ID")
            .setDesc("Search the pair database by image or companion filename/path.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.plugin.getPairRecords().flatMap(pair => [pair.imagePath, pair.notePath]).filter((path): path is string => typeof path === "string" && path.length > 0));
                text.setPlaceholder("Train Station")
                    .onChange(value => updatePairLookupByFile(value));
            })
            .addButton(button => button
                .setButtonText("Copy Pair ID")
                .onClick(async () => {
                    await navigator.clipboard.writeText(pairLookupByFilePairId);
                    new Notice(pairLookupByFilePairId ? "Pair ID copied." : "No pair ID to copy.");
                }));
        pairLookupByFileResult = containerEl.createEl("p", { cls: "setting-item-description" });
        updatePairLookupByFile("");

        let pairLookupByIdText = "Enter a pair ID to show its image and companion paths.";
        let pairLookupByIdImagePath = "";
        let pairLookupByIdNotePath = "";
        let pairLookupByIdResult: HTMLElement;
        const renderPairLookupByIdResult = () => {
            pairLookupByIdResult.empty();
            if (pairLookupByIdImagePath || pairLookupByIdNotePath) {
                pairLookupByIdResult.createDiv({ text: `Image: ${pairLookupByIdImagePath || "not resolved"}` });
                pairLookupByIdResult.createDiv({ text: `Companion: ${pairLookupByIdNotePath || "not resolved"}` });
                return;
            }
            pairLookupByIdResult.setText(pairLookupByIdText);
        };
        const updatePairLookupById = (value: string) => {
            const query = value.trim().toLowerCase();
            if (!query) {
                pairLookupByIdText = "Enter a pair ID to show its image and companion paths.";
                pairLookupByIdImagePath = "";
                pairLookupByIdNotePath = "";
                renderPairLookupByIdResult();
                return;
            }
            const record = this.plugin.getPairRecords().find(pair => pair.pairId.toLowerCase().includes(query));
            pairLookupByIdImagePath = record?.imagePath ?? "";
            pairLookupByIdNotePath = record?.notePath ?? "";
            pairLookupByIdText = record ? "" : "No pair record found for that ID.";
            renderPairLookupByIdResult();
        };
        new Setting(containerEl)
            .setName("Search Pair ID for FilePaths of File and Companion note")
            .setDesc("Search the pair database by pair ID and show both paths.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.plugin.getPairRecords().map(pair => pair.pairId));
                text.setPlaceholder("pair id")
                    .onChange(value => updatePairLookupById(value));
            })
            .addButton(button => button
                .setButtonText("Copy Image Path")
                .onClick(async () => {
                    await navigator.clipboard.writeText(pairLookupByIdImagePath);
                    new Notice(pairLookupByIdImagePath ? "Image path copied." : "No image path to copy.");
                }))
            .addButton(button => button
                .setButtonText("Copy Companion Path")
                .onClick(async () => {
                    await navigator.clipboard.writeText(pairLookupByIdNotePath);
                    new Notice(pairLookupByIdNotePath ? "Companion path copied." : "No companion path to copy.");
                }));
        pairLookupByIdResult = containerEl.createEl("p", { cls: "setting-item-description" });
        updatePairLookupById("");

        containerEl.createEl("h4", { text: "Manual Pairing" });
        containerEl.createEl("p", {
            text: "Manually pair an image/source file with its companion note in Autotag's internal pair database. This does not move, rename, or delete files.",
            cls: "setting-item-description",
        });

        let manualPairImagePath = "";
        let manualPairNotePath = "";
        let manualPairImageResult: HTMLElement;
        let manualPairNoteResult: HTMLElement;
        const findManualPairImageFile = (value: string): TFile | null => {
            const query = value.trim();
            if (!query) return null;
            return this.plugin.getManualPairImageFiles().find(file =>
                matchesPairPath(file.path, query)
                || file.name.toLowerCase().includes(query.toLowerCase())
            ) ?? null;
        };
        const findManualPairNoteFile = (value: string): TFile | null => {
            const query = value.trim();
            if (!query) return null;
            return this.plugin.getManualPairNoteFiles().find(file =>
                matchesPairPath(file.path, query)
                || file.name.toLowerCase().includes(query.toLowerCase())
            ) ?? null;
        };
        const renderManualPairSearchResult = (resultEl: HTMLElement, file: TFile | null, emptyText: string) => {
            resultEl.empty();
            if (!file) {
                resultEl.setText(emptyText);
                return;
            }
            const pair = this.plugin.getPairRecordForPath(file.path);
            resultEl.createDiv({ text: `Path: ${file.path}` });
            resultEl.createDiv({ text: `Current Pair ID: ${pair?.pairId ?? "unpaired"}` });
        };
        const updateManualPairImage = (value: string) => {
            const file = findManualPairImageFile(value);
            manualPairImagePath = file?.path ?? "";
            renderManualPairSearchResult(manualPairImageResult, file, value.trim() ? "No image/source file found in Base Path." : "Search for the image/source file in Base Path to pair.");
        };
        const updateManualPairNote = (value: string) => {
            const file = findManualPairNoteFile(value);
            manualPairNotePath = file?.path ?? "";
            renderManualPairSearchResult(manualPairNoteResult, file, value.trim() ? "No companion note found in BFM New File Location." : "Search for the companion note in BFM New File Location to pair.");
        };

        new Setting(containerEl)
            .setName("Manual pair image/source file")
            .setDesc("Searches only watched/source files inside the Base Path. You can use filename, vault-relative path, or full Windows path.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.plugin.getManualPairImageFiles().map(file => this.getPathSuggestionRelativeToRoot(file.path, this.plugin.settings.basePath)));
                text.setPlaceholder("Beach Room.jpg")
                    .onChange(value => updateManualPairImage(value));
            });
        manualPairImageResult = containerEl.createEl("p", { cls: "setting-item-description" });
        updateManualPairImage("");

        new Setting(containerEl)
            .setName("Manual pair companion note")
            .setDesc("Searches only markdown companion notes inside the BFM New File Location. You can use filename, vault-relative path, or full Windows path.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.plugin.getManualPairNoteFiles().map(file => this.getPathSuggestionRelativeToRoot(file.path, this.plugin.settings.bfmNewFileLocation)));
                text.setPlaceholder("Ata_Beach Room_jpg.md")
                    .onChange(value => updateManualPairNote(value));
            });
        manualPairNoteResult = containerEl.createEl("p", { cls: "setting-item-description" });
        updateManualPairNote("");

        new Setting(containerEl)
            .setName("Pair selected files")
            .setDesc("Creates or updates one Pair ID for the selected image/source file and companion note.")
            .addButton(button => button
                .setButtonText("Pair Files")
                .setCta()
                .onClick(async () => {
                    if (!manualPairImagePath || !manualPairNotePath) {
                        new Notice("Select both files before pairing.");
                        return;
                    }
                    await this.plugin.manualPairFiles(manualPairImagePath, manualPairNotePath);
                    this.refreshDisplayAnimated();
                }));

        new Setting(containerEl)
            .setName("Copy unpaired file paths")
            .setDesc(`${duplicateUnpairedFileCount} pairable file${duplicateUnpairedFileCount === 1 ? "" : "s"} are not currently in the pair database.`)
            .addButton(button => button
                .setButtonText("Copy Paths")
                .onClick(async () => {
                    await this.plugin.copyUnpairedFilesToClipboard();
                }));
        this.renderMoveAffectedFilesSetting(
            containerEl,
            "Choose a vault folder and move currently unpaired image/source files or companion notes there.",
            "Unpaired Files",
            "unpaired file",
            () => this.plugin.getUnpairedFiles()
        );

        new Setting(containerEl)
            .setName("Delete unpaired files")
            .setDesc(`${duplicateUnpairedFileCount} pairable file${duplicateUnpairedFileCount === 1 ? "" : "s"} are not currently in the pair database. This deletes only those unpaired files and avoids linked-pair cascade.`)
            .addButton(button => {
                button
                    .setButtonText("Delete Unpaired")
                    .setWarning()
                    .onClick(() => {
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Delete unpaired files?",
                            `This deletes ${duplicateUnpairedFileCount} currently unpaired file${duplicateUnpairedFileCount === 1 ? "" : "s"} from the vault. Paired files are not deleted by this action.`,
                            "Delete Unpaired",
                            async () => {
                                await this.plugin.deleteUnpairedFiles();
                                this.refreshDisplayAnimated();
                            }
                        ).open();
                    });
                button.buttonEl.addClass("bfm-autotag-danger-button");
            });

        this.createSettingsAnchor(containerEl, 'fix-recover', 'Fix / Recover');

        const recoverUnprocessedBaseFiles = this.plugin.getUnprocessedBaseFiles();

        containerEl.createEl('h4', { text: 'Single File' });
        let reprocessNotePath = "";
        let reprocessFileResult: HTMLElement;
        const getSingleFileStatus = (file: TFile): string => {
            const failedFile = this.plugin.getFailedFile(file.path);
            if (this.plugin.isPathProcessing(file.path)) return "Queued or processing now.";
            if (failedFile) return `Failed after ${failedFile.attempts} attempt${failedFile.attempts === 1 ? "" : "s"}.`;
            if (this.plugin.settings.processedFiles.includes(file.path)) return "Processed before.";
            if (this.plugin.getProtectedJob(file.path)) return "Logged for resume.";
            return "Unprocessed.";
        };
        const findReprocessNote = (value: string): TFile | null => {
            const query = value.trim();
            if (!query) return null;
            return this.plugin.getManualPairNoteFiles().find(file =>
                matchesPairPath(file.path, query)
                || file.name.toLowerCase().includes(query.toLowerCase())
            ) ?? null;
        };
        const updateReprocessFileSearch = (value: string) => {
            const note = findReprocessNote(value);
            reprocessNotePath = note?.path ?? "";
            reprocessFileResult.empty();
            if (!note) {
                if (value.trim()) reprocessFileResult.setText("No companion note found in the BFM New File Location.");
                return;
            }
            const sourceFile = this.plugin.findSourceFileForCompanionNote(note.path);
            reprocessFileResult.createDiv({ text: `Companion: ${note.path}` });
            reprocessFileResult.createDiv({ text: `Source: ${sourceFile?.path ?? "not resolved"}` });
            if (sourceFile instanceof TFile) {
                reprocessFileResult.createDiv({ text: `Status: ${getSingleFileStatus(sourceFile)}` });
            }
        };
        new Setting(containerEl)
            .setName("Search companion note to process again")
            .setDesc("Searches companion notes inside the BFM New File Location. The button resolves the linked source file, clears its processed, failed, and resume state, then queues it again.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.plugin.getManualPairNoteFiles().map(file => this.getPathSuggestionRelativeToRoot(file.path, this.plugin.settings.bfmNewFileLocation)));
                text.setPlaceholder("Ata_Beach Room_jpg.md")
                    .onChange(value => updateReprocessFileSearch(value));
            })
            .addButton(button => button
                .setButtonText("Process Again")
                .setCta()
                .onClick(async () => {
                    if (!reprocessNotePath) {
                        new Notice("Select a companion note first.");
                        return;
                    }
                    await this.plugin.processCompanionNoteAgain(reprocessNotePath);
                    this.refreshDisplayAnimated();
                }));
        reprocessFileResult = containerEl.createEl("p", { cls: "setting-item-description" });
        updateReprocessFileSearch("");

        let createCompanionSourcePath = "";
        let createCompanionResult: HTMLElement;
        const findCreateCompanionSourceFile = (value: string): TFile | null => {
            const query = value.trim();
            if (!query) return null;
            return this.plugin.getManualPairImageFiles().find(file =>
                matchesPairPath(file.path, query)
                || file.name.toLowerCase().includes(query.toLowerCase())
            ) ?? null;
        };
        const updateCreateCompanionSearch = (value: string) => {
            const file = findCreateCompanionSourceFile(value);
            createCompanionSourcePath = file?.path ?? "";
            createCompanionResult.empty();
            if (!file) {
                if (value.trim()) createCompanionResult.setText("No image/source file found in the Base Path.");
                return;
            }
            const companionNote = this.plugin.findCompanionNoteForSourceFile(file);
            createCompanionResult.createDiv({ text: `Source: ${file.path}` });
            createCompanionResult.createDiv({ text: `Companion: ${companionNote?.path ?? "missing"}` });
        };
        new Setting(containerEl)
            .setName("Create missing companion note for source file")
            .setDesc("Searches image/source files inside the Base Path and creates the expected BFM companion note only when no companion note exists.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.plugin.getManualPairImageFiles().map(file => this.getPathSuggestionRelativeToRoot(file.path, this.plugin.settings.basePath)));
                text.setPlaceholder("Anime/Beach.jpg")
                    .onChange(value => updateCreateCompanionSearch(value));
            })
            .addButton(button => button
                .setButtonText("Create Companion")
                .setCta()
                .onClick(async () => {
                    if (!createCompanionSourcePath) {
                        new Notice("Select an image/source file first.");
                        return;
                    }
                    await this.plugin.createCompanionNoteForSourceFile(createCompanionSourcePath);
                    this.refreshDisplayAnimated();
                }));
        createCompanionResult = containerEl.createEl("p", { cls: "setting-item-description" });
        updateCreateCompanionSearch("");

        containerEl.createEl('h4', { text: 'Existing Vaults' });

        new Setting(containerEl)
            .setName("Process existing source files")
            .setDesc("Queues every unprocessed file inside the Base Path for normal Autotag processing. Missing companion notes are created in the BFM New File Location during processing, according to your current settings.")
            .addButton(button => button
                .setButtonText("Process Existing Files")
                .setCta()
                .onClick(async () => {
                    await this.plugin.processUnprocessedBaseFiles();
                    this.refreshDisplayAnimated();
                }));

        new Setting(containerEl)
            .setName("Index existing files for duplicate protection")
            .setDesc("Creates missing companion notes for files in the Base Path, pairs them with their notes in the BFM New File Location, and rebuilds the duplicate hash index from the current vault state.")
            .addButton(button => button
                .setButtonText("Index Existing Files")
                .onClick(async () => {
                    button.setDisabled(true);
                    button.setButtonText("Indexing...");
                    await this.plugin.indexExistingVaultDuplicateProtection();
                    button.setDisabled(false);
                    button.setButtonText("Index Existing Files");
                    this.refreshDisplayAnimated();
                }));

        containerEl.createEl('h4', { text: 'Failed Files' });
        const failedWarningLines: string[] = [];
        if (this.plugin.settings.failedFiles.length > 0) {
            failedWarningLines.push(`${this.plugin.settings.failedFiles.length} failed file${this.plugin.settings.failedFiles.length === 1 ? "" : "s"} are tracked. Use Retry Failed Files, Copy failed file details, Delete failed files, or Open Failure Help Note.`);
        }
        if (recoverUnprocessedBaseFiles.length > 0) {
            failedWarningLines.push(`${recoverUnprocessedBaseFiles.length} watched file${recoverUnprocessedBaseFiles.length === 1 ? "" : "s"} are unprocessed. Use Process all unprocessed files when you want a vault-wide catch-up run.`);
        }
        this.renderAttentionWarningPanel(containerEl, "bfm-autotag-fix-recover-warning", "Fix / Recover attention", failedWarningLines);

        containerEl.createEl('p', {
            text: this.plugin.settings.failedFiles.length > 0
                ? `${this.plugin.settings.failedFiles.length} failed file${this.plugin.settings.failedFiles.length === 1 ? "" : "s"} tracked. Failed files stop retrying after ${this.plugin.settings.maxProcessingAttempts} attempts.`
                : `No failed files tracked. Failed files stop retrying after ${this.plugin.settings.maxProcessingAttempts} attempts.`,
            cls: 'setting-item-description',
        });

        new Setting(containerEl)
            .setName("Retry Failed Files")
            .setDesc("Queues failed files again and resets their attempt counters.")
            .addButton(button =>
                button
                    .setButtonText("Retry Failed")
                    .setCta()
                    .onClick(async () => {
                        await this.plugin.retryFailedFiles();
                        this.refreshDisplayAnimated();
                    }));

        new Setting(containerEl)
            .setName("Copy failed file details")
            .setDesc("Copies the failed-file list to the clipboard so it can be pasted elsewhere.")
            .addButton(button =>
                button
                    .setButtonText("Copy Details")
                    .onClick(async () => {
                        const failedFiles = this.plugin.settings.failedFiles;
                        const text = failedFiles.length > 0
                            ? failedFiles.map(file => {
                                const failedAt = file.lastFailedAt ? new Date(file.lastFailedAt).toLocaleString() : "unknown time";
                                return `${file.path}\nAttempts: ${file.attempts}\nLast failed: ${failedAt}\nReason: ${file.reason}`;
                            }).join("\n\n")
                            : "No failed files tracked.";

                        await navigator.clipboard.writeText(text);
                        new Notice(failedFiles.length > 0 ? "Failed file details copied to clipboard." : "No failed file details to copy.");
                    }));
        this.renderMoveAffectedFilesSetting(
            containerEl,
            "Choose a vault folder and move files currently listed as failed there.",
            "Failed Files",
            "failed file",
            () => this.plugin.getFailedProcessingFiles()
        );

        new Setting(containerEl)
            .setName("Clear Failed Files")
            .setDesc("Clears the failed-file list without deleting files or notes.")
            .addButton(button => {
                button
                    .setButtonText("Clear Failed")
                    .onClick(() => {
                        const failedCount = this.plugin.settings.failedFiles.length;
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Clear failed files?",
                            `This clears ${failedCount} failed file record${failedCount === 1 ? "" : "s"} without deleting files or notes.`,
                            "Clear Failed",
                            async () => {
                                await this.plugin.clearFailedFiles();
                                this.refreshDisplayAnimated();
                            }
                        ).open();
                    });
                button.buttonEl.addClass("bfm-autotag-danger-button");
            });
        new Setting(containerEl)
            .setName("Delete failed files")
            .setDesc("Deletes the files currently listed as failed and clears their failure records. Missing files are cleaned from the failed list.")
            .addButton(button => {
                button
                    .setButtonText("Delete Failed")
                    .setWarning()
                    .onClick(() => {
                        const failedCount = this.plugin.settings.failedFiles.length;
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Delete failed files?",
                            `This deletes ${failedCount} failed file${failedCount === 1 ? "" : "s"} from the vault and clears their failure records. Companion notes are not chased by this action.`,
                            "Delete Failed",
                            async () => {
                                await this.plugin.deleteFailedFiles();
                                this.refreshDisplayAnimated();
                            }
                        ).open();
                    });
                button.buttonEl.addClass("bfm-autotag-danger-button");
            });
        new Setting(containerEl)
            .setName("Open Failure Help Note")
            .setDesc("Creates or updates a note with likely causes and fixes for the most recent failed files. You may delete that note after reading.")
            .addButton(button =>
                button
                    .setButtonText("Open Help Note")
                    .onClick(async () => {
                        await this.plugin.openFailureHelpNote();
                    }));

        containerEl.createEl('h4', { text: 'Processed Files' });
        containerEl.createEl('p', {
            text: `${this.plugin.settings.processedFiles.length} processed file${this.plugin.settings.processedFiles.length === 1 ? "" : "s"} tracked. ${recoverUnprocessedBaseFiles.length} unprocessed watched file${recoverUnprocessedBaseFiles.length === 1 ? "" : "s"} available to process.`,
            cls: 'setting-item-description',
        });
		// Forget all processed files
		new Setting(containerEl)
			.setName("Forget All Processed Files")
			.setDesc("Clears the processed-file list and creates a summary note. It does not queue files by itself.")
			.addButton(button => {
				button
					.setButtonText("! Forget All !")
					.setWarning()
					.onClick(() => {
                        new ConfirmForgetAllProcessedFilesModal(
                            this.app,
                            this.plugin.settings.processedFiles.length,
                            async () => {
                                await this.plugin.forgetAllProcessedFiles();
                                this.refreshDisplayAnimated();
                            }
                        ).open();
					});
				button.buttonEl.addClass("bfm-autotag-danger-button");
			});

        new Setting(containerEl)
            .setName("Process all unprocessed files")
            .setDesc("Queues every unprocessed file inside the Base Path for normal Autotag processing.")
            .addButton(button => button
                .setButtonText("Process Unprocessed")
                .setCta()
                .onClick(async () => {
                    await this.plugin.processUnprocessedBaseFiles();
                    this.refreshDisplayAnimated();
                }));
        this.organizeRenderedSettingsSections(containerEl);
        this.enhanceInfoDescriptionAnimations(containerEl);
        this.registerInfoCloseGuards(containerEl);
        const backToTopEl = containerEl.createDiv({ cls: "bfm-autotag-back-to-top" });
        const backToTopButton = backToTopEl.createEl("button", { text: "Back to top" });
        backToTopButton.type = "button";
        backToTopButton.onclick = () => this.scrollSettingsToTop();
    }
}

