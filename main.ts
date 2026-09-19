import { App, Editor, FileSystemAdapter, getFrontMatterInfo, MarkdownFileInfo, MarkdownRenderer, Menu, Modal, Notice, parseYaml, Plugin, PluginSettingTab, requestUrl, setIcon, Setting, TFile, TFolder } from 'obsidian';

type FailedProcessingFile = {
    path: string;
    reason: string;
    attempts: number;
    lastFailedAt: number;
};

type ShutdownProtectionStage = "queued" | "fingerprinted" | "companion-note" | "duplicate-decision" | "waiting-duplicate-choice" | "processing" | "writing";
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

type AutotagFileContext = {
    selectedFile: TFile;
    isWatchedSource: boolean;
    isCompanionNote: boolean;
    sourceFile: TFile | null;
    companionNote: TFile | null;
    pairRecord: PairRecord | null;
    sourcePath?: string;
    companionPath?: string;
};

type FolderPropertyValueSource = "manual" | "automatic";

type FolderPropertyMapping = {
    id: string;
    property: string;
    values: string[];
    valueSource: FolderPropertyValueSource;
    format: string;
    aiCandidateMode: CandidateMode;
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
    hadAiTagResponse?: boolean;
};

type GeneratedMarkdownPreviewRefs = {
    checkPanelEl: HTMLElement;
    titleTextEl: HTMLElement;
    listEl: HTMLElement;
    cleanTextEl: HTMLElement;
    embedSettingHostEl: HTMLElement;
    previewPanelEl: HTMLElement;
    codeEl: HTMLElement;
};

type TemplatePropertySuggestionRefs = {
    panelEl: HTMLElement;
    titleTextEl: HTMLElement;
    listEl: HTMLElement;
    cleanTextEl: HTMLElement;
    copyButtonEl: HTMLButtonElement;
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
    detailsEl: HTMLElement;
    descriptionEl: HTMLElement;
    checksEl: HTMLElement;
    signature: string;
};

type ExpensiveHealthCounts = {
    updatedAt: number;
    duplicateUnlinkedHashCount: number;
    duplicateUnhashedFileCount: number;
    duplicateUnpairedFileCount: number;
    recoverUnprocessedBaseFileCount: number;
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

type TemplateSource = "internal" | "template-file";
type CompanionNameCaseMode = "current" | "legacy-title-lower";
type SettingsProfileFile = {
    name?: string;
    custom?: boolean;
    sourceName?: string;
    createdAt?: number;
    updatedAt?: number;
    settings?: Partial<AutotagSettings>;
};

type SettingsProfileSummary = {
    id: string;
    name: string;
    custom: boolean;
    sourceName?: string;
    builtIn: boolean;
    path?: string;
    settings: Partial<AutotagSettings>;
};

const BUILTIN_DEFAULT_SETTINGS_PROFILE_ID = "builtin:default";
const BUILTIN_DEV_SETTINGS_PROFILE_ID = "builtin:dev";
const BUILTIN_FEATURE_TEST_SETTINGS_PROFILE_ID = "builtin:feature-test";
const SETTINGS_PROFILE_FOLDER_NAME = "settings-profiles";
const SETTINGS_PROFILE_CUSTOM_SUFFIX = " [Custom]";
const LEARNED_VAULT_RELATIONS_FILE_NAME = "Autotag Learned Relationships.md";
const REJECTED_VAULT_RELATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_OLLAMA_VISION_PROMPT = [
    "Describe this image for an Obsidian companion note.",
    "Be concrete and concise.",
    "Mention visible subjects, setting, style, objects, colors, composition, and readable text when present.",
    "Do not guess people, places, countries, dates, brands, or events unless they are visible or provided as metadata.",
    "Return only the description text.",
].join(" ");

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

type LearnedVaultRelation = {
    evidence: string;
    candidate: string;
    relationType: string;
    model: string;
    confidence: number;
    pinned: boolean;
    confirmations: number;
    createdAt: number;
    lastConfirmedAt: number;
    lastUsedAt: number;
};

type RejectedVaultRelation = {
    evidence: string;
    candidate: string;
    model: string;
    rejectedAt: number;
    lastSeenAt: number;
};

type VaultMatchingTierSettings = {
    exact: boolean;
    aliases: boolean;
    learned: boolean;
    structural: boolean;
    semantic: boolean;
};

type VaultCandidateMatch = {
    candidate: string;
    evidence: string;
    tier: keyof VaultMatchingTierSettings;
    score: number;
};

type VaultEvidenceChannel = "folder" | "filename" | "geolocation" | "aiTags" | "description" | "semantic" | "structural" | "learned" | "manual";

type RankedVaultVocabularyCandidate = {
    name: string;
    score: number;
    sourceScores: Record<VaultEvidenceChannel, number>;
};

type VaultCandidatePromptItem = {
    id: string;
    match: VaultCandidateMatch;
};

type VaultCandidateSelection = {
    id: string;
    evidence: string;
    relationType: string;
    confidence?: number;
};

type LocalStructuralRelation = {
    evidence: string;
    relationType: string;
    requiresCorroboration: boolean;
    evidenceChannelCount: number;
};

class ProcessingTimings {
    private readonly startedAt = Date.now();
    private readonly stages = new Map<string, number>();

    constructor(private readonly filePath: string) {}

    async measure<T>(stage: string, task: () => Promise<T>): Promise<T> {
        const startedAt = Date.now();
        try {
            return await task();
        } finally {
            this.add(stage, Date.now() - startedAt);
        }
    }

    add(stage: string, durationMs: number): void {
        this.stages.set(stage, (this.stages.get(stage) ?? 0) + Math.max(0, Math.round(durationMs)));
    }

    finish(outcome: "completed" | "failed" | "skipped"): void {
        const stageDurations = Object.fromEntries(
            Array.from(this.stages.entries()).map(([stage, durationMs]) => [stage, `${durationMs}ms`])
        );
        console.info("Autotag processing timings", {
            file: this.filePath,
            outcome,
            total: `${Date.now() - this.startedAt}ms`,
            ...stageDurations,
        });
    }
}

interface AutotagSettings {
    settingsProfileId: string; // Active import/export setup profile
    basePath: string;             // Folder where watched files are placed
    moveOutsideFilesToBasePath: boolean; // Move newly added supported source/media files into the managed source folder before processing
    companionNoteFolder: string;   // Folder where companion notes are created
    companionNoteNameFormat: string;    // Companion note filename format
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
    removeFolderTagsFromAiTags: boolean; // Remove folder-tag values before writing AI tags
    removeGeolocationFromAiTags: boolean; // Remove known geolocation terms before writing AI tags
    aiTagsUseAsVaultCandidate: boolean; // Use AI-generated tags as vault-awareness candidates
    aiDescriptionPropertyEnabled: boolean; // Write AI-generated description property
    aiDescriptionPropertyName: string; // Property name for AI-generated description
    useGeolocationForAiDescription: boolean; // Use known geolocation metadata to improve AI descriptions
    useGeolocationForAiTags: boolean; // Use known geolocation metadata as AI tag evidence
    imageAnalysisEnabled: boolean; // Use local Ollama vision to create image descriptions
    ollamaVisionModel: string; // Local Ollama vision model name
    ollamaVisionPrompt: string; // Prompt sent to the local Ollama vision model
    aiDescriptionMinimumWords: number; // Requested minimum word count for generated image descriptions
    processedFiles: string[];     // Store paths of already handled files
    failedFiles: FailedProcessingFile[]; // Store files that failed processing
    shutdownProtectionEnabled: boolean; // Persist unfinished queue items across reloads
    autoProcessUnprocessedOnReload: boolean; // Queue unprocessed watched files when the plugin loads
    deleteLinkedFilePair: boolean; // Delete companion/source counterpart when one side is deleted
    protectedJobs: ProtectedProcessingJob[]; // Persisted queue/resume checkpoints
    folderPropertyMappings: FolderPropertyMapping[]; // Folder names mapped to custom frontmatter properties
    folderPropertyManualValueMemory: Record<string, string[]>; // Remember manual folder values by property name
    folderFallbackProperty: string; // Frontmatter property for folder names not matched by property lists
    folderFallbackFormat: string; // Formatting template for fallback folder values
    folderFallbackAiCandidateMode: CandidateMode; // How fallback folder values contribute to AI tags
    folderFallbackUseAsAiCandidate: boolean; // Use fallback folder values as AI candidates
    folderFallbackUseAsVaultCandidate: boolean; // Use fallback folder property as a vault-awareness candidate
    useFolderTags: boolean; // Use folder names for frontmatter values
    templateSource: TemplateSource; // Where the base note template comes from
    frontmatterTemplate: string; // Template for generated companion note frontmatter
    templateFilePath: string; // Vault-relative template file used when templateSource is template-file
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
    bridgeRules: string; // Shared manual concept expansion rules for both Bridge engines
    bridgeEnabled: boolean; // Apply manual bridge enrichment rules
    manualEnrichmentEnabled: boolean; // Expand generated tags through direct manual enrichment rules
    selfLearningBridgeEnabled: boolean; // Learn and reuse structural or semantic relationships between AI evidence and VA vocabulary
    bridgeUseAiInput: boolean; // Allow Bridge rules to use AI description and accepted AI tags
    bridgeUseFilenameInput: boolean; // Allow Bridge rules to use filename candidates
    bridgeUseFolderInput: boolean; // Allow Bridge rules to use folder-tag candidates
    bridgeUseGeolocationInput: boolean; // Allow Bridge rules to use known geolocation metadata
    bridgeUsePreBridgeVaultAwarenessOutput: boolean; // Include pre-bridge/related bridge terms in Vault Awareness output
    bridgeLinguisticFeatures: LinguisticFeatureSettings;
    hideBridgeLinguisticFeatures: boolean;
    vocabularyCandidateProperties?: string[]; // Deprecated; candidate properties now come from visible per-property toggles
    excludedVocabularyTerms: string[]; // Terms excluded from vault candidate vocabulary
    filenameCandidateMode: CandidateMode; // How image filenames contribute to AI tags
    filenameCandidatesHumanReadableOnly: boolean; // Ignore camera/hash/date-style filenames before using filename candidates
    maxPromptVocabularyTerms: number; // Max vault vocabulary candidates sent to Ollama
    vaultAwarenessEnabled: boolean; // Add known vault vocabulary after base AI tagging
    maxVaultAwareAdditions: number; // Max known vault concepts added by vault awareness
    vaultAwarenessOutputEnabled: boolean; // Write Vault Awareness additions to a separate property
    vaultAwarenessOutputPropertyName: string; // Property name for separate Vault Awareness additions
    vaultAwarenessOutputFormat: string; // Formatting template for separate Vault Awareness additions
    vaultAwarenessOutputExclusive: boolean; // Keep Vault Awareness additions out of AI tags when writing separately
    vaultLinguisticFeatures: LinguisticFeatureSettings;
    hideVaultLinguisticFeatures: boolean;
    learnedVaultRelations: LearnedVaultRelation[]; // Vault-local relationships confirmed structurally or by the Vault Awareness model
    rejectedVaultRelations: RejectedVaultRelation[]; // Temporary vault-local negative relationship cache
    learnedVaultRelationCacheLimit: number; // Maximum retained learned Vault Awareness relationships
    learnedVaultRelationMinimumConfidence: number; // Discard cached relationships below this confidence score
    vaultMatchingTiers: VaultMatchingTierSettings; // Retrieval tiers used to shortlist existing vault values
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
    queueBatchMaxWaitMs: number;  // Max debounce window when batching dropped files
    companionNoteCreationRetries: number; // Retry count after companion note creation is not verified
    retryInitialWaitSeconds: number; // Wait before the first retry; later retries add the same interval
    maxProcessingAttempts: number;// Max attempts before a failed file stops retrying
}

const DEFAULT_SETTINGS: AutotagSettings = {
    settingsProfileId: BUILTIN_DEFAULT_SETTINGS_PROFILE_ID,
    basePath: 'Files/Attachments/Ata File',
    moveOutsideFilesToBasePath: true,
    companionNoteFolder: 'Files/Attachments/Ata Data',
    companionNoteNameFormat: 'Ata_{{Name}}_{{extension}}',
    hideLimitedFileTypeWarnings: true,
    limitedFileTypeWarningSkips: {
        avif: false,
        heic: false,
        heif: false,
        tif: false,
        tiff: false,
        jxl: false,
        svg: false,
        ico: false,
        psd: false,
        psb: false,
        raw: false,
        dng: false,
        cr2: false,
        cr3: false,
        nef: false,
        arw: false,
        rw2: false,
        orf: false,
        raf: false,
    },
    linkToFilePropertyEnabled: true,
    linkToFilePropertyName: 'linktofile',
    fileTypePropertyEnabled: true,
    fileTypePropertyName: 'filetype',
    embedPropertyEnabled: true,
    embedPropertyName: 'embed',
    aiTagsPropertyEnabled: true,
    aiTagsPropertyName: 'aiTags',
    aiTagsFormat: '',
    removeFolderTagsFromAiTags: true,
    removeGeolocationFromAiTags: true,
    aiTagsUseAsVaultCandidate: false,
    aiDescriptionPropertyEnabled: true,
    aiDescriptionPropertyName: 'aiDescription',
    useGeolocationForAiDescription: true,
    useGeolocationForAiTags: true,
    imageAnalysisEnabled: true,
    ollamaVisionModel: 'llava-llama3',
    ollamaVisionPrompt: DEFAULT_OLLAMA_VISION_PROMPT,
    aiDescriptionMinimumWords: 100,
    processedFiles: [],
    failedFiles: [],
    shutdownProtectionEnabled: true,
    autoProcessUnprocessedOnReload: true,
    deleteLinkedFilePair: true,
    protectedJobs: [],
    folderPropertyMappings: [
        { id: 'domains', property: 'links', values: [], valueSource: 'automatic', format: '[[Example]]', aiCandidateMode: 'all', useAsAiCandidate: true, useAsVaultCandidate: true },
    ],
    folderPropertyManualValueMemory: {
        domains: [],
        types: [],
        tags: [],
    },
    folderFallbackProperty: 'autotag-fallback',
    folderFallbackFormat: '',
    folderFallbackAiCandidateMode: 'all',
    folderFallbackUseAsAiCandidate: true,
    folderFallbackUseAsVaultCandidate: false,
    useFolderTags: true,
    templateSource: 'internal',
    frontmatterTemplate: [
        'links:',
        'aiDescription:',
        'aiTags:',
        'country:',
        'city:',
        'embed:',
        'filetype:',
        'linktofile:',
        'autotag-fallback:',
    ].join('\n'),
    templateFilePath: 'Tools/Templates/Tem-Autotag.md',
    writeImageEmbedInBody: true,
    geolocationEnabled: true,
    geolocationProvider: 'public-nominatim',
    geolocationLocalUrl: 'http://127.0.0.1:8080',
    geolocationProperties: [
        { id: 'latitude', field: 'country', property: 'country', format: '' },
        { id: 'city', field: 'city', property: 'city', format: '' },
    ],
    geocodeCache: {},
    pendingGeocodeJobs: [],
    geocodePublicDay: '',
    geocodePublicRequestsToday: 0,
    geocodeLastRequestAt: 0,
    aiTaggingEnabled: true,
    bridgeRules: 'House => Architecture',
    bridgeEnabled: true,
    manualEnrichmentEnabled: true,
    selfLearningBridgeEnabled: true,
    bridgeUseAiInput: true,
    bridgeUseFilenameInput: true,
    bridgeUseFolderInput: true,
    bridgeUseGeolocationInput: true,
    bridgeUsePreBridgeVaultAwarenessOutput: true,
    bridgeLinguisticFeatures: {
        synonyms: 'use',
        grammaticalVariants: 'use',
        compoundDecomposition: 'use',
        vaultAliases: 'use',
        acronymsAbbreviations: 'use',
        spellingVariants: 'use',
        broaderNarrower: 'use',
        canonicalization: 'use',
    },
    hideBridgeLinguisticFeatures: true,
    excludedVocabularyTerms: ['Ata'],
    filenameCandidateMode: 'all',
    filenameCandidatesHumanReadableOnly: true,
    maxPromptVocabularyTerms: 20,
    vaultAwarenessEnabled: true,
    maxVaultAwareAdditions: 20,
    vaultAwarenessOutputEnabled: false,
    vaultAwarenessOutputPropertyName: 'vaulttags',
    vaultAwarenessOutputFormat: '',
    vaultAwarenessOutputExclusive: false,
    vaultLinguisticFeatures: {
        synonyms: 'use',
        grammaticalVariants: 'use',
        compoundDecomposition: 'use',
        vaultAliases: 'use',
        acronymsAbbreviations: 'use',
        spellingVariants: 'use',
        broaderNarrower: 'use',
        canonicalization: 'use',
    },
    hideVaultLinguisticFeatures: true,
    learnedVaultRelations: [],
    rejectedVaultRelations: [],
    learnedVaultRelationCacheLimit: 1500,
    learnedVaultRelationMinimumConfidence: 60,
    vaultMatchingTiers: {
        exact: true,
        aliases: true,
        learned: true,
        structural: true,
        semantic: true,
    },
    ollamaGeneratedTagsCap: 100,
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    ollamaModel: 'qwen3:8b',
    duplicateDetectionMode: 'exact-visual',
    exactDuplicateAction: 'ask',
    visualDuplicateAction: 'ask',
    visualDuplicateThreshold: 8,
    duplicateMigrateLinksOnReplace: true,
    duplicateAutorenameOnReplace: true,
    waitForDuplicateSourceProcessing: true,
    duplicateRecords: [],
    pairRecords: [],
    parallelWorkers: 4,
    queueBatchMaxWaitMs: 15000,
    companionNoteCreationRetries: 2,
    retryInitialWaitSeconds: 2,
    maxProcessingAttempts: 3,
};

const BUILTIN_DEV_PROFILE_SETTINGS: Partial<AutotagSettings> = {
    basePath: "Files/Attachments/Ata File",
    moveOutsideFilesToBasePath: true,
    companionNoteFolder: "Files/Attachments/Ata Data",
    companionNoteNameFormat: "Ata_{{Name}}_{{extension}}",
    hideLimitedFileTypeWarnings: true,
    limitedFileTypeWarningSkips: {
        avif: false,
        heic: false,
        heif: false,
        tif: false,
        tiff: false,
        jxl: false,
        svg: false,
        ico: false,
        psd: false,
        psb: false,
        raw: false,
        dng: false,
        cr2: false,
        cr3: false,
        nef: false,
        arw: false,
        rw2: false,
        orf: false,
        raf: false,
    },
    linkToFilePropertyEnabled: true,
    linkToFilePropertyName: "linktofile",
    fileTypePropertyEnabled: true,
    fileTypePropertyName: "filetype",
    embedPropertyEnabled: true,
    embedPropertyName: "embed",
    aiTagsPropertyEnabled: true,
    aiTagsPropertyName: "aiDomains",
    aiTagsFormat: "[[Example]]",
    removeFolderTagsFromAiTags: true,
    removeGeolocationFromAiTags: true,
    aiTagsUseAsVaultCandidate: false,
    aiDescriptionPropertyEnabled: true,
    aiDescriptionPropertyName: "aiDescription",
    useGeolocationForAiDescription: true,
    useGeolocationForAiTags: true,
    ollamaVisionModel: "llava-llama3",
    ollamaVisionPrompt: DEFAULT_OLLAMA_VISION_PROMPT,
    aiDescriptionMinimumWords: 100,
    shutdownProtectionEnabled: true,
    autoProcessUnprocessedOnReload: true,
    deleteLinkedFilePair: true,
    folderPropertyMappings: [
        {
            id: "1789001282744-pl8zaikbl0h",
            property: "geoCountry",
            values: [],
            valueSource: "automatic",
            format: "[[Example]]",
            aiCandidateMode: "all",
            useAsAiCandidate: true,
            useAsVaultCandidate: false,
        },
        {
            id: "1789001908630-jb4x6f4rsnt",
            property: "geoRegion",
            values: [],
            valueSource: "automatic",
            format: "",
            aiCandidateMode: "all",
            useAsAiCandidate: true,
            useAsVaultCandidate: false,
        },
        {
            id: "1789001927644-ou13d4femmn",
            property: "geoCity",
            values: [],
            valueSource: "automatic",
            format: "",
            aiCandidateMode: "all",
            useAsAiCandidate: true,
            useAsVaultCandidate: false,
        },
        {
            id: "1789587761213-8hjvs96djg",
            property: "domains",
            values: [],
            valueSource: "automatic",
            format: "[[Example]]",
            aiCandidateMode: "all",
            useAsAiCandidate: true,
            useAsVaultCandidate: true,
        },
        {
            id: "1789587774316-qmo1fi68t4a",
            property: "types",
            values: ["Ata"],
            valueSource: "automatic",
            format: "",
            aiCandidateMode: "all",
            useAsAiCandidate: true,
            useAsVaultCandidate: false,
        },
    ],
    folderPropertyManualValueMemory: {
        currentstatus: ["pop"],
        tags: [],
        domains: [],
        "autotag-fallback": [],
        types: [],
        geocountry: [],
        georegion: [],
        geocity: [],
    },
    folderFallbackProperty: "domains",
    folderFallbackFormat: "[[Example]]",
    folderFallbackAiCandidateMode: "all",
    folderFallbackUseAsAiCandidate: true,
    folderFallbackUseAsVaultCandidate: true,
    useFolderTags: true,
    templateSource: "internal",
    frontmatterTemplate: "domains:\ntypes:\n- Ata\nrelated:\ncurrentStatus:\nlinktofile: \nfiletype: \nembed: \nlastModified:\ncreated:\naiDomains:\naiDescription: \ngeoCountry:\ngeoRegion:\ngeoCity:\n",
    templateFilePath: "",
    writeImageEmbedInBody: true,
    geolocationEnabled: true,
    geolocationProvider: "public-nominatim",
    geolocationLocalUrl: "http://127.0.0.1:8080",
    geolocationProperties: [
        {
            id: "country",
            field: "country",
            property: "geoCountry",
            format: "[[Example]]",
        },
        {
            id: "1788715546405-e5u230ozo5v",
            field: "region",
            property: "geoRegion",
            format: "[[Example]]",
        },
        {
            id: "1788715558589-whq5cb38pp",
            field: "city",
            property: "geoCity",
            format: "[[Example]]",
        },
    ],
    aiTaggingEnabled: true,
    bridgeRules: "House => Architecture",
    bridgeEnabled: true,
    manualEnrichmentEnabled: true,
    bridgeUseAiInput: true,
    bridgeUseFilenameInput: true,
    bridgeUseFolderInput: true,
    bridgeUseGeolocationInput: true,
    bridgeUsePreBridgeVaultAwarenessOutput: true,
    bridgeLinguisticFeatures: {
        synonyms: "use",
        grammaticalVariants: "use",
        compoundDecomposition: "use",
        vaultAliases: "use",
        acronymsAbbreviations: "use",
        spellingVariants: "use",
        broaderNarrower: "use",
        canonicalization: "use",
    },
    hideBridgeLinguisticFeatures: true,
    excludedVocabularyTerms: ["Ata"],
    filenameCandidateMode: "all",
    filenameCandidatesHumanReadableOnly: true,
    maxPromptVocabularyTerms: 20,
    vaultAwarenessEnabled: true,
    maxVaultAwareAdditions: 20,
    vaultAwarenessOutputEnabled: true,
    vaultAwarenessOutputPropertyName: "domains",
    vaultAwarenessOutputFormat: "[[Example]]",
    vaultAwarenessOutputExclusive: false,
    vaultLinguisticFeatures: {
        synonyms: "use",
        grammaticalVariants: "use",
        compoundDecomposition: "use",
        vaultAliases: "use",
        acronymsAbbreviations: "use",
        spellingVariants: "use",
        broaderNarrower: "use",
        canonicalization: "use",
    },
    hideVaultLinguisticFeatures: true,
    learnedVaultRelationCacheLimit: 1500,
    learnedVaultRelationMinimumConfidence: 60,
    ollamaGeneratedTagsCap: 100,
    ollamaBaseUrl: "http://127.0.0.1:11434",
    ollamaModel: "qwen3:8b",
    duplicateDetectionMode: "exact-visual",
    exactDuplicateAction: "ask",
    visualDuplicateAction: "ask",
    visualDuplicateThreshold: 8,
    duplicateMigrateLinksOnReplace: true,
    duplicateAutorenameOnReplace: true,
    waitForDuplicateSourceProcessing: true,
    parallelWorkers: 4,
    queueBatchMaxWaitMs: 15000,
    companionNoteCreationRetries: 2,
    retryInitialWaitSeconds: 2,
    maxProcessingAttempts: 3,
};

const BUILTIN_FEATURE_TEST_PROFILE_SETTINGS: Partial<AutotagSettings> = {
    ...BUILTIN_DEV_PROFILE_SETTINGS,
    folderPropertyMappings: [
        {
            id: "1789001282744-pl8zaikbl0h",
            property: "folderTags1",
            values: [],
            valueSource: "automatic",
            format: "[[Example]]",
            aiCandidateMode: "all",
            useAsAiCandidate: true,
            useAsVaultCandidate: true,
        },
        {
            id: "1789587774316-qmo1fi68t4a",
            property: "folderTags2",
            values: [],
            valueSource: "automatic",
            format: "",
            aiCandidateMode: "all",
            useAsAiCandidate: true,
            useAsVaultCandidate: false,
        },
    ],
    folderFallbackProperty: "customFallback",
    folderFallbackFormat: "[[Example]]",
    folderFallbackAiCandidateMode: "all",
    folderFallbackUseAsAiCandidate: true,
    folderFallbackUseAsVaultCandidate: false,
    frontmatterTemplate: "folderTags1:\nfolderTags2:\ncustomFallback:\ncustomTextProperty:\n- EXTRA TEXT\ncustomAndGeoCountry:\n- EXtraaaaa TexTTT\nRegionAndCityOutputDifferentCustomFormats:\naiDescription:\naiDomains:\nembed:\nfiletype:\nlinktofile:\nvaultAwareness:",
    geolocationProperties: [
        {
            id: "country",
            field: "country",
            property: "customAndGeoCountry",
            format: "[[Example]]",
        },
        {
            id: "1788715546405-e5u230ozo5v",
            field: "region",
            property: "RegionAndCityOutputDifferentCustomFormats",
            format: "[[noFormat]]+ Example",
        },
        {
            id: "1788715558589-whq5cb38pp",
            field: "city",
            property: "RegionAndCityOutputDifferentCustomFormats",
            format: "[[Example]]",
        },
    ],
    vaultAwarenessOutputPropertyName: "vaultAwareness",
};

const SETTINGS_PROFILE_CONTROLLED_KEYS: (keyof AutotagSettings)[] = [
    "basePath",
    "moveOutsideFilesToBasePath",
    "companionNoteFolder",
    "companionNoteNameFormat",
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
    "removeFolderTagsFromAiTags",
    "removeGeolocationFromAiTags",
    "aiTagsUseAsVaultCandidate",
    "aiDescriptionPropertyEnabled",
    "aiDescriptionPropertyName",
    "useGeolocationForAiDescription",
    "useGeolocationForAiTags",
    "ollamaVisionModel",
    "ollamaVisionPrompt",
    "aiDescriptionMinimumWords",
    "shutdownProtectionEnabled",
    "autoProcessUnprocessedOnReload",
    "deleteLinkedFilePair",
    "folderPropertyMappings",
    "folderPropertyManualValueMemory",
    "folderFallbackProperty",
    "folderFallbackFormat",
    "folderFallbackAiCandidateMode",
    "folderFallbackUseAsAiCandidate",
    "folderFallbackUseAsVaultCandidate",
    "useFolderTags",
    "templateSource",
    "frontmatterTemplate",
    "templateFilePath",
    "writeImageEmbedInBody",
    "geolocationEnabled",
    "geolocationProvider",
    "geolocationLocalUrl",
    "geolocationProperties",
    "aiTaggingEnabled",
    "bridgeRules",
    "bridgeEnabled",
    "manualEnrichmentEnabled",
    "selfLearningBridgeEnabled",
    "bridgeUseAiInput",
    "bridgeUseFilenameInput",
    "bridgeUseFolderInput",
    "bridgeUseGeolocationInput",
    "bridgeUsePreBridgeVaultAwarenessOutput",
    "bridgeLinguisticFeatures",
    "hideBridgeLinguisticFeatures",
    "excludedVocabularyTerms",
    "filenameCandidateMode",
    "filenameCandidatesHumanReadableOnly",
    "maxPromptVocabularyTerms",
    "vaultAwarenessEnabled",
    "maxVaultAwareAdditions",
    "vaultAwarenessOutputEnabled",
    "vaultAwarenessOutputPropertyName",
    "vaultAwarenessOutputFormat",
    "vaultAwarenessOutputExclusive",
    "vaultLinguisticFeatures",
    "hideVaultLinguisticFeatures",
    "vaultMatchingTiers",
    "learnedVaultRelationCacheLimit",
    "learnedVaultRelationMinimumConfidence",
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
    "queueBatchMaxWaitMs",
    "companionNoteCreationRetries",
    "retryInitialWaitSeconds",
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

const RECOMMENDED_VISION_MODELS = [
    { name: "llava-llama3", label: "llava-llama3 (8B) [default]" },
    { name: "llama3.2-vision:11b", label: "llama3.2-vision (11B)" },
    { name: "llama3.2-vision:90b", label: "llama3.2-vision (90B)" },
    { name: "llava:7b", label: "llava (7B)" },
    { name: "llava:13b", label: "llava (13B)" },
    { name: "llava:34b", label: "llava (34B)" },
    { name: "gemma3:4b", label: "gemma3 (4B)" },
    { name: "gemma3:12b", label: "gemma3 (12B)" },
    { name: "gemma3:27b", label: "gemma3 (27B)" },
    { name: "minicpm-v:8b", label: "minicpm-v (8B)" },
    { name: "bakllava", label: "bakllava" },
    { name: "moondream", label: "moondream" },
];

const AUTOTAG_SOURCE_FILE_EXTENSIONS = new Set([
    "jpg", "jpeg", "jfif", "png", "webp", "gif", "bmp", "avif", "heic", "heif", "tif", "tiff", "jxl", "svg", "ico",
    "psd", "psb", "raw", "dng", "cr2", "cr3", "nef", "arw", "rw2", "orf", "raf",
    "mp4", "m4v", "mov", "webm", "mkv", "avi", "wmv",
    "mp3", "wav", "m4a", "flac", "ogg", "opus",
    "pdf",
]);

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
    { extension: "avif", label: "AVIF", description: "Modern compressed image. AI description and visual duplicate preview support depend on Obsidian, Electron, and the selected Ollama vision model." },
    { extension: "heic", label: "HEIC", description: "Apple/iPhone photo container. Autotag can create notes and exact hashes, but AI description, previews, and GPS parsing may depend on external support." },
    { extension: "heif", label: "HEIF", description: "Apple/iPhone image container. Autotag can create notes and exact hashes, but AI description, previews, and GPS parsing may depend on external support." },
    { extension: "tif", label: "TIFF", description: "Archival image format. Large files or uncommon encodings may fail in AI description or visual duplicate preview." },
    { extension: "tiff", label: "TIFF", description: "Archival image format. Large files or uncommon encodings may fail in AI description or visual duplicate preview." },
    { extension: "jxl", label: "JPEG XL", description: "JPEG XL is not consistently supported by Electron or local vision models yet." },
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

export default class AutotagPlugin extends Plugin {
    settings: AutotagSettings;
    processingQueue = new Map<string, QueuedProcessingFile>();
    queueFlushTimer: number | null = null;
    queueBatchStartedAt: number | null = null;
    isProcessingQueue = false;
    vocabularyByFile = new Map<string, VaultVocabularyRecord[]>();
    vaultVocabulary = new Map<string, VaultVocabularyEntry>();
    vaultAliasToCanonical = new Map<string, string>();
    learnedVaultRelationsByCandidate = new Map<string, LearnedVaultRelation[]>();
    learnedVaultRelationsByPair = new Map<string, LearnedVaultRelation>();
    rejectedVaultRelationsByPair = new Map<string, RejectedVaultRelation>();
    fileBinaryReadCache = new Map<string, Promise<ArrayBuffer>>();
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
    recentAutoMovedSourcePaths = new Map<string, string>();
    settingTab: AutotagSettingTab | null = null;
    startupAutoProcessTimer: number | null = null;
    vaultVocabularyBuildTimer: number | null = null;
    vaultVocabularyBuildPromise: Promise<void> | null = null;
    vaultVocabularyCacheDirty = true;
    automaticFolderPropertySyncTimer: number | null = null;
    vaultVocabularyBuildGeneration = 0;
    expensiveHealthCountsCache: ExpensiveHealthCounts | null = null;
    private isApplyingSettingsProfile = false;
    private settingsProfileSnapshot = "";
    private isUnloading = false;
    private settingsSaveChain: Promise<void> = Promise.resolve();
    private ollamaInferenceChain: Promise<void> = Promise.resolve();
    private vaultAwarenessSelectionChain: Promise<void> = Promise.resolve();
    createRunId(path: string): string {
        return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10) + "-" + path;
    }

    async runOllamaInference<T>(task: () => Promise<T>): Promise<T> {
        const result = this.ollamaInferenceChain.then(task, task);
        this.ollamaInferenceChain = result.then(() => undefined, () => undefined);
        return result;
    }

    async runVaultAwarenessSelection<T>(task: () => Promise<T>): Promise<T> {
        const result = this.vaultAwarenessSelectionChain.then(task, task);
        this.vaultAwarenessSelectionChain = result.then(() => undefined, () => undefined);
        return result;
    }

    getFileBinaryCacheKey(file: TFile): string {
        return `${this.getVaultPathKey(file.path)}\n${file.stat.mtime}\n${file.stat.size}`;
    }

    readFileBinaryCached(file: TFile): Promise<ArrayBuffer> {
        const key = this.getFileBinaryCacheKey(file);
        const existing = this.fileBinaryReadCache.get(key);
        if (existing) return existing;
        const pending = this.app.vault.readBinary(file).catch(error => {
            this.fileBinaryReadCache.delete(key);
            throw error;
        });
        this.fileBinaryReadCache.set(key, pending);
        return pending;
    }

    prefetchFileBinary(file: TFile): void {
        void this.readFileBinaryCached(file).catch(error => {
            console.warn(`Autotag could not prefetch ${file.path}`, error);
        });
    }

    clearFileBinaryCache(path: string): void {
        const pathPrefix = `${this.getVaultPathKey(path)}\n`;
        Array.from(this.fileBinaryReadCache.keys()).forEach(key => {
            if (key.startsWith(pathPrefix)) this.fileBinaryReadCache.delete(key);
        });
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
        return this.getPairRecords().find(record => this.areVaultPathsSame(record.imagePath, imagePath)) ?? null;
    }

    getPairRecordForNotePath(notePath: string): PairRecord | null {
        return this.getPairRecords().find(record => record.notePath && this.areVaultPathsSame(record.notePath, notePath)) ?? null;
    }

    getPairRecordForPath(path: string): PairRecord | null {
        return this.getPairRecords().find(record =>
            this.areVaultPathsSame(record.imagePath, path)
            || (!!record.notePath && this.areVaultPathsSame(record.notePath, path))
        ) ?? null;
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
        const filtered = records.filter(record =>
            !this.areVaultPathsSame(record.imagePath, path)
            && !this.areVaultPathsSame(record.notePath, path)
        );
        if (filtered.length === records.length) return false;
        this.settings.pairRecords = filtered;
        return true;
    }

    updatePairRecordsForRename(oldPath: string, newPath: string): boolean {
        let changed = false;
        this.settings.pairRecords = this.getPairRecords().map(record => {
            const updated = { ...record };
            if (this.areVaultPathsSame(updated.imagePath, oldPath)) {
                updated.imagePath = newPath;
                updated.updatedAt = Date.now();
                changed = true;
            }
            if (this.areVaultPathsSame(updated.notePath, oldPath)) {
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
            const existing = records.find(record =>
                this.areVaultPathsSame(record.imagePath, duplicate.filePath)
                || this.areVaultPathsSame(record.notePath, duplicate.notePath)
            );
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
        return this.getPathKeyValue(this.currentRunIds, path) === runId;
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
            if (
                this.areVaultPathsSame(pair.imagePath, path)
                || this.areVaultPathsSame(pair.expectedNotePath, path)
                || this.areVaultPathsSame(pair.resolvedNotePath, path)
            ) return pair;
        }
        return null;
    }

    getLinkedFileFromActiveRunPair(path: string): TFile | null {
        const pair = this.getActiveRunPairForPath(path);
        if (!pair) return null;
        const linkedPath = this.areVaultPathsSame(path, pair.imagePath)
            ? pair.resolvedNotePath ?? pair.expectedNotePath
            : pair.imagePath;
        const linked = this.getVaultFileByPathFlexible(linkedPath);
        return linked instanceof TFile ? linked : null;
    }

    cleanupActiveRunPairsForPath(path: string, runId?: string): void {
        if (runId) {
            this.activeRunPairs.delete(runId);
            return;
        }
        Array.from(this.activeRunPairs.entries()).forEach(([key, pair]) => {
            if (
                this.areVaultPathsSame(pair.imagePath, path)
                || this.areVaultPathsSame(pair.expectedNotePath, path)
                || this.areVaultPathsSame(pair.resolvedNotePath, path)
            ) {
                this.activeRunPairs.delete(key);
            }
        });
    }

    renameActiveRunPairPath(oldPath: string, newPath: string): void {
        this.activeRunPairs.forEach((pair, runId) => {
            const updated = { ...pair };
            let changed = false;
            if (this.areVaultPathsSame(updated.imagePath, oldPath)) {
                updated.imagePath = newPath;
                changed = true;
            }
            if (this.areVaultPathsSame(updated.expectedNotePath, oldPath)) {
                updated.expectedNotePath = newPath;
                changed = true;
            }
            if (this.areVaultPathsSame(updated.resolvedNotePath, oldPath)) {
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
        return this.areVaultPathsSame(action.newImagePath, path)
            || this.areVaultPathsSame(action.newNotePath, path)
            || this.areVaultPathsSame(action.originalImagePath, path)
            || this.areVaultPathsSame(action.originalNotePath, path);
    }

    cancelPendingDuplicateActionsForPath(path: string): boolean {
        let changed = false;
        Array.from(this.pendingDuplicateActions.values()).forEach(action => {
            if (!this.doesPendingDuplicateActionUsePath(action, path)) return;
            this.pendingDuplicateActions.delete(action.runId);
            this.deletePathKey(this.processingQueue, action.newImagePath);
            this.deletePathKey(this.currentRunIds, action.newImagePath);
            this.cleanupActiveRunPairsForPath(action.newImagePath, action.runId);
            this.duplicateFingerprintCache.delete(this.getRunCacheKey(action.newImagePath, action.runId));
            this.duplicateHandlingCache.delete(this.getRunCacheKey(action.newImagePath, action.runId));
            this.markDuplicateProcessingComplete(action.newImagePath, action.runId);
            if (this.removeProtectedJob(action.newImagePath)) changed = true;
            changed = true;
            new Notice(`Autotag canceled duplicate action for ${action.newImagePath} because a required file was deleted.`);
        });
        return changed;
    }

    renamePendingDuplicateActionPath(oldPath: string, newPath: string): void {
        this.pendingDuplicateActions.forEach((action, runId) => {
            const updated = { ...action };
            let changed = false;
            if (this.areVaultPathsSame(updated.newImagePath, oldPath)) { updated.newImagePath = newPath; changed = true; }
            if (this.areVaultPathsSame(updated.newNotePath, oldPath)) { updated.newNotePath = newPath; changed = true; }
            if (this.areVaultPathsSame(updated.originalImagePath, oldPath)) { updated.originalImagePath = newPath; changed = true; }
            if (this.areVaultPathsSame(updated.originalNotePath, oldPath)) { updated.originalNotePath = newPath; changed = true; }
            if (changed) this.pendingDuplicateActions.set(runId, updated);
        });
    }
    // =========================
    // AI LAYER (PUT HERE)
    // =========================

    getOllamaVisionModel(): string {
        return this.settings.ollamaVisionModel?.trim() || DEFAULT_SETTINGS.ollamaVisionModel;
    }

    getOllamaVisionPrompt(): string {
        return this.settings.ollamaVisionPrompt?.trim() || DEFAULT_SETTINGS.ollamaVisionPrompt;
    }

    getAiDescriptionMinimumWords(): number {
        return this.clampSetting(
            this.settings.aiDescriptionMinimumWords,
            DEFAULT_SETTINGS.aiDescriptionMinimumWords,
            20,
            500
        );
    }

    getOllamaVisionRequestPrompt(strict = false): string {
        const minimumWords = this.getAiDescriptionMinimumWords();
        const lengthInstruction = `Write at least ${minimumWords} words while remaining factual and avoiding repetition.`;
        return strict
            ? `${this.getOllamaVisionPrompt()} ${lengthInstruction} The minimum word count is required; expand concrete visible details before finishing.`
            : `${this.getOllamaVisionPrompt()} ${lengthInstruction}`;
    }

    countDescriptionWords(value: string): number {
        return (value.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;
    }

    arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        let binary = "";
        for (let index = 0; index < bytes.length; index += chunkSize) {
            binary += String.fromCharCode(...Array.from(bytes.subarray(index, index + chunkSize)));
        }
        return btoa(binary);
    }

    buildOllamaVisionRequestVariants(model: string, imageBase64: string): Record<string, unknown>[] {
        const createBase = (strict: boolean) => ({
            model,
            stream: false,
            options: {
                temperature: 0.1,
                num_predict: Math.max(1024, Math.min(2048, this.getAiDescriptionMinimumWords() * 3)),
            },
            messages: [
                {
                    role: "system",
                    content: [
                        "You create factual image descriptions for Obsidian companion notes.",
                        "Return only natural description text.",
                        "Describe only what is visible or explicitly provided.",
                        "Do not invent people, places, dates, brands, events, metadata, filenames, image codes, or IDs.",
                        "Do not include markdown headings, YAML, bullet points, or explanations.",
                    ].join(" "),
                },
                {
                    role: "user",
                    content: this.getOllamaVisionRequestPrompt(strict),
                    images: [imageBase64],
                },
            ],
        });
        const standardBase = createBase(false);
        const strictBase = createBase(true);

        const variants: Record<string, unknown>[] = [
            { ...standardBase, ...( /qwen|gemma3/i.test(model) ? { think: false } : {} ) },
            { ...standardBase },
            { ...strictBase, ...( /qwen|gemma3/i.test(model) ? { think: false } : {} ) },
            { ...strictBase },
        ];

        const seen = new Set<string>();
        return variants.filter(variant => {
            const key = JSON.stringify(variant);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async analyzeImageFile(file: TFile): Promise<string | null> {
        if (!this.settings.imageAnalysisEnabled) return null;

        const endpoint = this.getOllamaChatUrl();
        const model = this.getOllamaVisionModel();
        if (!endpoint || !model) {
            new Notice("Image Analysis settings are incomplete");
            return null;
        }

        try {
            const imageBase64 = this.arrayBufferToBase64(await this.readFileBinaryCached(file));
            const requestVariants = this.buildOllamaVisionRequestVariants(model, imageBase64);
            let lastError = "unknown error";
            let longestDescription: string | null = null;

            for (let attempt = 0; attempt < requestVariants.length; attempt += 1) {
                const requestBody = requestVariants[attempt];
                const response = await this.runOllamaInference(() => requestUrl({
                    url: endpoint,
                    method: "POST",
                    throw: false,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody),
                }));

                if (response.status < 200 || response.status >= 300) {
                    lastError = `HTTP ${response.status}: ${response.text?.slice(0, 300) || "no response body"}`;
                    console.warn("Autotag Ollama vision attempt failed", {
                        attempt: attempt + 1,
                        model,
                        status: response.status,
                        body: lastError,
                    });
                    continue;
                }

                const description = this.cleanHumanReadableAiDescriptionText(
                    this.normalizeOllamaDescriptionText(this.extractOllamaMessageText(response.json))
                );
                if (description?.trim()) {
                    const trimmedDescription = description.trim();
                    const wordCount = this.countDescriptionWords(trimmedDescription);
                    if (!longestDescription || wordCount > this.countDescriptionWords(longestDescription)) {
                        longestDescription = trimmedDescription;
                    }
                    if (wordCount >= this.getAiDescriptionMinimumWords()) return trimmedDescription;
                    lastError = `description contained ${wordCount}/${this.getAiDescriptionMinimumWords()} requested words`;
                    continue;
                }
                lastError = "empty description";
            }

            if (longestDescription) {
                console.warn(`Autotag Ollama vision did not reach the requested minimum for ${file.path}: ${lastError}. Using the longest factual response.`);
                return longestDescription;
            }
            console.warn(`Autotag Ollama vision returned no description for ${file.path}: ${lastError}`);
            return null;
        } catch (e) {
            console.error("Autotag Ollama vision failed", e);
            return null;
        }
    }

    arrayBufferToHex(buffer: ArrayBuffer): string {
        return Array.from(new Uint8Array(buffer))
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    async computeExactHash(file: TFile): Promise<string> {
        const content = await this.readFileBinaryCached(file);
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
                ? await this.computeVisualHash(file).catch(error => { console.warn("Autotag visual duplicate hash failed", error); return undefined; })
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
            console.warn("Autotag duplicate fingerprint precompute failed", error);
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
        const records = this.getDuplicateRecords().filter(record => !this.areVaultPathsSame(record.filePath, filePath));
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
        const records = this.getDuplicateRecords().filter(existing => !this.areVaultPathsSame(existing.filePath, record.filePath));
        records.push(record);
        this.settings.duplicateRecords = records;
        const pairRecord = this.getPairRecordForImagePath(record.filePath) ?? this.ensurePairRecordForImage(record.filePath);
        this.updatePairRecord(pairRecord.pairId, { notePath: record.notePath });
    }

    removeDuplicateRecordsForPath(path: string): boolean {
        const records = this.getDuplicateRecords();
        const filtered = records.filter(record =>
            !this.areVaultPathsSame(record.filePath, path)
            && !this.areVaultPathsSame(record.notePath, path)
        );
        const pairChanged = this.removePairRecordsForPath(path);
        if (filtered.length === records.length) return pairChanged;
        this.settings.duplicateRecords = filtered;
        return true;
    }

    updateDuplicateRecordsForRename(oldPath: string, newPath: string, newNotePath?: string): boolean {
        let changed = this.updatePairRecordsForRename(oldPath, newPath);
        this.settings.duplicateRecords = this.getDuplicateRecords().map(record => {
            const updated = { ...record };
            if (this.areVaultPathsSame(updated.filePath, oldPath)) {
                updated.filePath = newPath;
                if (newNotePath) updated.notePath = newNotePath;
                changed = true;
            }
            if (this.areVaultPathsSame(updated.notePath, oldPath)) {
                updated.notePath = newPath;
                changed = true;
            }
            return updated;
        });
        return changed;
    }
    isDuplicateProtectionActive(): boolean {
        return this.settings.duplicateDetectionMode !== "off";
    }

    getUnlinkedDuplicateRecords(): DuplicateRecord[] {
        const pendingPaths = this.getPendingHealthPathKeys();
        return this.getDuplicateRecords().filter(record => {
            if (
                this.isPathPendingHealthEvaluation(record.filePath, pendingPaths)
                || this.isPathPendingHealthEvaluation(record.notePath, pendingPaths)
            ) return false;
            const image = this.getVaultFileByPathFlexible(record.filePath);
            const note = this.getVaultFileByPathFlexible(record.notePath);
            return !(image instanceof TFile) || !(note instanceof TFile);
        });
    }

    getHashableBaseFiles(): TFile[] {
        return this.app.vault.getFiles()
            .filter(file => this.isPathInBasePath(file.path))
            .filter(file => file.extension.toLowerCase() !== "md")
            .sort((a, b) => a.path.localeCompare(b.path));
    }

    invalidateExpensiveHealthCounts(): void {
        this.expensiveHealthCountsCache = null;
    }

    getPendingHealthPathKeys(): Set<string> {
        const pendingPaths = new Set<string>();
        const addPath = (path: string | null | undefined): void => {
            const key = this.getVaultPathKey(path);
            if (key) pendingPaths.add(key);
        };
        const addSourceAndExpectedNote = (path: string | null | undefined): void => {
            addPath(path);
            const sourceFile = this.getVaultFileByPathFlexible(path);
            if (sourceFile instanceof TFile && sourceFile.extension.toLowerCase() !== "md") {
                addPath(this.getCompanionNotePath(sourceFile));
            }
        };

        this.currentRunIds.forEach((_runId, path) => addSourceAndExpectedNote(path));
        this.processingQueue.forEach(item => addSourceAndExpectedNote(item.file.path));
        this.activeWorkerPaths.forEach(path => addSourceAndExpectedNote(path));
        this.activeRunPairs.forEach(pair => {
            addPath(pair.imagePath);
            addPath(pair.expectedNotePath);
            addPath(pair.resolvedNotePath);
        });
        this.settings.protectedJobs.forEach(job => {
            if (this.settings.processedFiles.some(path => this.areVaultPathsSame(path, job.path))) return;
            addSourceAndExpectedNote(job.path);
            addPath(job.notePath);
        });
        this.pendingDuplicateActions.forEach(action => {
            if (action.processingComplete) return;
            addPath(action.newImagePath);
            addPath(action.newNotePath);
            addPath(action.originalImagePath);
            addPath(action.originalNotePath);
        });

        return pendingPaths;
    }

    isPathPendingHealthEvaluation(path: string, pendingPaths = this.getPendingHealthPathKeys()): boolean {
        return pendingPaths.has(this.getVaultPathKey(path));
    }

    getExpensiveHealthCounts(maxAgeMs = 5000): ExpensiveHealthCounts {
        const now = Date.now();
        if (this.expensiveHealthCountsCache && now - this.expensiveHealthCountsCache.updatedAt < maxAgeMs) {
            return this.expensiveHealthCountsCache;
        }

        const counts: ExpensiveHealthCounts = {
            updatedAt: now,
            duplicateUnlinkedHashCount: this.getUnlinkedDuplicateRecords().length,
            duplicateUnhashedFileCount: this.getUnhashedFiles().length,
            duplicateUnpairedFileCount: this.getUnpairedFiles().length,
            recoverUnprocessedBaseFileCount: this.getUnprocessedBaseFiles().length,
        };
        this.expensiveHealthCountsCache = counts;
        return counts;
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

    isAutotagSourceFileExtension(extension: string): boolean {
        const normalizedExtension = extension.replace(/^\./, "").trim().toLowerCase();
        return AUTOTAG_SOURCE_FILE_EXTENSIONS.has(normalizedExtension);
    }

    getUnhashedFiles(): TFile[] {
        const hashedPaths = new Set(this.getDuplicateRecords().map(record => this.getVaultPathKey(record.filePath)));
        const pendingPaths = this.getPendingHealthPathKeys();
        return this.getHashableBaseFiles().filter(file =>
            !hashedPaths.has(this.getVaultPathKey(file.path))
            && !this.isPathPendingHealthEvaluation(file.path, pendingPaths)
        );
    }

    hasUsableDuplicateIndexForFile(file: TFile): boolean {
        const record = this.getDuplicateRecords().find(item => this.areVaultPathsSame(item.filePath, file.path));
        if (!record?.exactHash) return false;
        if (this.settings.duplicateDetectionMode === "exact-visual" && !record.visualHash) return false;

        const note = record.notePath ? this.getVaultFileByPathFlexible(record.notePath) : null;
        if (!(note instanceof TFile)) return false;

        const pair = this.getPairRecordForImagePath(file.path) ?? this.getPairRecordForNotePath(record.notePath);
        return !!pair?.notePath && this.areVaultPathsSame(pair.imagePath, file.path) && this.areVaultPathsSame(pair.notePath, note.path);
    }

    getUnprocessedFilesNeedingDuplicateIndex(): TFile[] {
        return this.getUnprocessedBaseFiles().filter(file => !this.hasUsableDuplicateIndexForFile(file));
    }

    getManualPairImageFiles(): TFile[] {
        return this.app.vault.getFiles()
            .filter(file => this.isPathInBasePath(file.path))
            .filter(file => file.extension.toLowerCase() !== "md")
            .sort((a, b) => a.path.localeCompare(b.path));
    }

    getManualPairNoteFiles(): TFile[] {
        return this.app.vault.getFiles()
            .filter(file => this.isPathInBfmNewFileLocation(file.path))
            .filter(file => file.extension.toLowerCase() === "md")
            .sort((a, b) => a.path.localeCompare(b.path));
    }

    getPairableFiles(): TFile[] {
        return [...this.getManualPairImageFiles(), ...this.getManualPairNoteFiles()]
            .sort((a, b) => a.path.localeCompare(b.path));
    }

    getUnpairedFiles(): TFile[] {
        const pairedPaths = new Set<string>();
        const pendingPaths = this.getPendingHealthPathKeys();
        this.getPairRecords().forEach(record => {
            pairedPaths.add(this.getVaultPathKey(record.imagePath));
            if (record.notePath) pairedPaths.add(this.getVaultPathKey(record.notePath));
        });
        return this.getPairableFiles().filter(file => {
            const pathKey = this.getVaultPathKey(file.path);
            return !pairedPaths.has(pathKey) && !pendingPaths.has(pathKey);
        });
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
        return `Autotag Review/${cleanedName}`.replace(/\\/g, "/").replace(/\/+/g, "/");
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
            console.warn("Autotag move-folder dialog unavailable", error);
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
            const pathKey = this.getVaultPathKey(path);
            if (!pathKey || seen.has(pathKey)) return;
            seen.add(pathKey);
            const file = this.getVaultFileByPathFlexible(path);
            if (file instanceof TFile) files.push(file);
        });
        return files.sort((a, b) => a.path.localeCompare(b.path));
    }

    getUnlinkedHashAffectedFiles(): TFile[] {
        const paths = this.getUnlinkedDuplicateRecords().flatMap(record => [record.filePath, record.notePath]);
        return this.getExistingFilesFromPaths(paths);
    }

    getFailedProcessingFiles(): TFile[] {
        return this.getExistingFilesFromPaths(this.getFailedFileRecordsNeedingAttention().map(file => file.path));
    }

    getFailedFileRecordsNeedingAttention(): FailedProcessingFile[] {
        const pendingPaths = this.getPendingHealthPathKeys();
        return this.settings.failedFiles.filter(file => !this.isPathPendingHealthEvaluation(file.path, pendingPaths));
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

    isAutoMoveEligibleNewFile(file: TFile): boolean {
        const extension = file.extension.toLowerCase();
        if (!extension || extension === "md") return false;
        if (!this.isAutotagSourceFileExtension(extension)) return false;
        if (this.isPathInBasePath(file.path) || this.isPathInBfmNewFileLocation(file.path)) return false;

        const pathSegments = this.normalizeVaultPath(file.path).split("/");
        if (pathSegments.some(segment => segment.startsWith(".") || segment === "node_modules")) return false;

        return true;
    }

    async moveNewFileIntoBasePathIfNeeded(file: TFile): Promise<TFile | null> {
        if (!this.settings.moveOutsideFilesToBasePath) return file;
        if (!this.isAutoMoveEligibleNewFile(file)) return file;

        const targetFolder = this.getEffectiveBasePath();
        try {
            await this.ensureVaultFolder(targetFolder);
            const targetPath = await this.getAvailableMovePath(targetFolder, file);
            if (targetPath === file.path) return file;

            const oldPath = file.path;
            await this.app.fileManager.renameFile(file, targetPath);
            const movedFile = this.app.vault.getAbstractFileByPath(targetPath);
            if (!(movedFile instanceof TFile)) {
                new Notice(`Moved ${file.name}, but could not resolve the new file path.`);
                return null;
            }
            if (this.updateInternalReferencesForMovedFile(oldPath, targetPath, movedFile)) {
                await this.saveSettings();
            }
            this.recentAutoMovedSourcePaths.set(targetPath, oldPath);
            window.setTimeout(() => {
                if (this.recentAutoMovedSourcePaths.get(targetPath) === oldPath) {
                    this.recentAutoMovedSourcePaths.delete(targetPath);
                }
            }, 5 * 60 * 1000);
            new Notice(`Moved ${movedFile.name} into the managed source folder.`);
            return movedFile;
        } catch (error) {
            console.warn("Autotag could not move new file into the managed source folder.", file.path, error);
            new Notice(`Could not move ${file.name} into the managed source folder.`);
            return null;
        }
    }

    updateInternalReferencesForMovedFile(oldPath: string, newPath: string, file: TFile): boolean {
        let changed = false;
        const failedFile = this.getFailedFile(oldPath);
        if (failedFile) {
            failedFile.path = newPath;
            changed = true;
        }
        const renamedImageNotePath = file.extension.toLowerCase() === "md" ? undefined : this.getCompanionNotePath(file);
        if (this.updateDuplicateRecordsForRename(oldPath, newPath, renamedImageNotePath)) changed = true;
        if (this.updateProtectedJobPath(oldPath, newPath, renamedImageNotePath)) changed = true;
        if (this.updatePendingGeocodeJobsForRename(oldPath, newPath)) changed = true;
        const processedIndex = this.settings.processedFiles.findIndex(processedPath => this.areVaultPathsSame(processedPath, oldPath));
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
            const currentFile = this.getVaultFileByPathFlexible(originalFile.path);
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
                console.warn("Autotag could not move affected file", oldPath, targetPath, error);
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
            const currentFile = this.getVaultFileByPathFlexible(file.path);
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
                console.warn("Autotag could not delete unpaired file", file.path, error);
            }
        }
        if (changed) await this.saveSettings();
        new Notice(`Deleted ${deleted} unpaired file${deleted === 1 ? "" : "s"}${failed > 0 ? `; ${failed} failed` : ""}.`);
    }

    isPathProcessing(path: string): boolean {
        if (this.hasPathKey(this.currentRunIds, path) || this.hasPathKey(this.processingQueue, path)) return true;
        if (this.getActiveRunPairForPath(path)) return true;
        for (const action of this.pendingDuplicateActions.values()) {
            if (!action.processingComplete && this.doesPendingDuplicateActionUsePath(action, path)) return true;
        }
        return false;
    }

    isPathActivelyProcessing(path: string): boolean {
        return this.hasPathKey(this.currentRunIds, path)
            || this.hasPathKey(this.processingQueue, path)
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
        const image = this.getVaultFileByPathFlexible(imagePath);
        const note = this.getVaultFileByPathFlexible(notePath);
        if (!(image instanceof TFile) || !(note instanceof TFile)) {
            new Notice("Manual pairing needs two existing files.");
            return;
        }
        if (!this.isPathInBasePath(image.path) || image.extension.toLowerCase() === "md") {
            new Notice("Manual pairing image/source must be a non-markdown file inside the Base Path.");
            return;
        }
        if (!this.isPathInBfmNewFileLocation(note.path) || note.extension.toLowerCase() !== "md") {
            new Notice("Manual pairing companion must be a markdown note inside the Companion Note Folder.");
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
        const image = this.getVaultFileByPathFlexible(imagePath);
        const note = this.getVaultFileByPathFlexible(notePath);
        if (!(image instanceof TFile) || !(note instanceof TFile)) {
            new Notice("Manual pairing needs two existing files.");
            return;
        }
        if (!this.isPathInBasePath(image.path) || image.extension.toLowerCase() === "md") {
            new Notice("Manual pairing image/source must be a non-markdown file inside the Base Path.");
            return;
        }
        if (!this.isPathInBfmNewFileLocation(note.path) || note.extension.toLowerCase() !== "md") {
            new Notice("Manual pairing companion must be a markdown note inside the Companion Note Folder.");
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
            && !this.areVaultPathsSame(record.imagePath, image.path)
            && !this.areVaultPathsSame(record.notePath, image.path)
            && !this.areVaultPathsSame(record.imagePath, note.path)
            && !this.areVaultPathsSame(record.notePath, note.path)
        );
        this.settings.pairRecords.push({
            pairId,
            imagePath: image.path,
            notePath: note.path,
            createdAt,
            updatedAt: now,
        });

        const imageRecord = this.getDuplicateRecords().find(record => this.areVaultPathsSame(record.filePath, image.path));
        this.settings.duplicateRecords = this.getDuplicateRecords()
            .filter(record => !this.areVaultPathsSame(record.filePath, image.path) && !this.areVaultPathsSame(record.notePath, note.path));
        if (imageRecord) {
            this.settings.duplicateRecords.push({ ...imageRecord, filePath: image.path, notePath: note.path });
        }
        if (saveAfterPairing) await this.saveSettings();
        if (showNotice) new Notice(`Paired files with Pair ID ${pairId}.`);
    }

    async regenerateDuplicateHashes(): Promise<void> {
        const files = this.getHashableBaseFiles();
        const records: DuplicateRecord[] = [];
        let failed = 0;
        for (const file of files) {
            try {
                const exactHash = await this.computeExactHash(file);
                const visualHash = this.settings.duplicateDetectionMode === "exact-visual"
                    ? await this.computeVisualHash(file).catch(() => undefined)
                    : undefined;
                records.push({
                    filePath: file.path,
                    notePath: this.getCompanionNotePath(file),
                    exactHash,
                    visualHash,
                    processedAt: Date.now(),
                });
            } catch (error) {
                failed += 1;
                console.warn("Autotag could not regenerate duplicate hash", file.path, error);
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
        const failedFiles = [...this.getFailedFileRecordsNeedingAttention()];
        if (failedFiles.length === 0) {
            new Notice("No failed files to delete.");
            return;
        }

        let deleted = 0;
        let missing = 0;
        let failed = 0;
        let changed = false;
        for (const failedFile of failedFiles) {
            const file = this.getVaultFileByPathFlexible(failedFile.path);
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
                console.warn("Autotag could not delete failed file", failedFile.path, error);
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
        this.deletePathKey(this.processingQueue, path);
        this.deletePathFromSet(this.activeWorkerPaths, path);
        this.deletePathKey(this.currentRunIds, path);
        this.duplicateFingerprintCache.delete(path);
        if (runId) this.duplicateFingerprintCache.delete(this.getRunCacheKey(path, runId));
        this.duplicateHandlingCache.delete(path);
        if (runId) this.duplicateHandlingCache.delete(this.getRunCacheKey(path, runId));
        this.markDuplicateProcessingComplete(path, runId);
        if (this.clearFailedFile(path)) changed = true;
        if (this.removeDuplicateRecordsForPath(path)) changed = true;
        if (this.removeProtectedJob(path)) changed = true;
        const beforeGeocodeJobs = this.settings.pendingGeocodeJobs.length;
        this.settings.pendingGeocodeJobs = this.settings.pendingGeocodeJobs.filter(job =>
            !this.areVaultPathsSame(job.imagePath, path)
            && !this.areVaultPathsSame(job.notePath, path)
        );
        if (this.settings.pendingGeocodeJobs.length !== beforeGeocodeJobs) changed = true;
        const index = this.settings.processedFiles.findIndex(processedPath => this.areVaultPathsSame(processedPath, path));
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
        const pairImage = pairRecord ? this.getVaultFileByPathFlexible(pairRecord.imagePath) : null;
        if (pairImage instanceof TFile) return pairImage;
        const record = this.getDuplicateRecords().find(item => this.areVaultPathsSame(item.notePath, notePath));
        if (record) {
            const file = this.getVaultFileByPathFlexible(record.filePath);
            if (file instanceof TFile) return file;
        }

        const job = this.settings.protectedJobs.find(item => item.notePath && this.areVaultPathsSame(item.notePath, notePath));
        if (job) {
            const file = this.getVaultFileByPathFlexible(job.path);
            if (file instanceof TFile) return file;
        }

        const note = this.getVaultFileByPathFlexible(notePath);
        const cache = note instanceof TFile ? this.app.metadataCache.getFileCache(note) : null;
        const frontmatter = cache?.frontmatter as Record<string, unknown> | undefined;
        const linkProperty = this.getLinkToFilePropertyName();
        const linkedPath = typeof frontmatter?.[linkProperty] === "string"
            ? this.extractPathFromWikiLink(frontmatter[linkProperty] as string)
            : null;
        if (linkedPath) {
            const linkedFile = this.getVaultFileByPathFlexible(linkedPath);
            if (linkedFile instanceof TFile) return linkedFile;
        }

        return this.getHashableBaseFiles().find(file => this.doesCompanionNotePathMatchFile(notePath, file)) ?? null;
    }
    findCompanionNoteForSourceFile(file: TFile): TFile | null {
        const activeLinked = this.getLinkedFileFromActiveRunPair(file.path);
        if (activeLinked instanceof TFile) return activeLinked;
        const pairRecord = this.getPairRecordForImagePath(file.path);
        const pairNote = pairRecord?.notePath ? this.getVaultFileByPathFlexible(pairRecord.notePath) : null;
        if (pairNote instanceof TFile) return pairNote;
        const record = this.getDuplicateRecords().find(item => this.areVaultPathsSame(item.filePath, file.path));
        const recordNote = record ? this.getVaultFileByPathFlexible(record.notePath) : null;
        if (recordNote instanceof TFile) return recordNote;

        const job = this.settings.protectedJobs.find(item => this.areVaultPathsSame(item.path, file.path) && item.notePath);
        const jobNote = job?.notePath ? this.getVaultFileByPathFlexible(job.notePath) : null;
        if (jobNote instanceof TFile) return jobNote;

        return this.findCompanionNoteVariant(file);
    }

    getLinkedFileForDeletion(file: TFile): TFile | null {
        const pairRecord = this.getPairRecordForPath(file.path);
        const linkedPairPath = pairRecord && this.areVaultPathsSame(pairRecord.imagePath, file.path)
            ? pairRecord.notePath
            : pairRecord?.notePath && this.areVaultPathsSame(pairRecord.notePath, file.path) ? pairRecord.imagePath : undefined;
        if (linkedPairPath) {
            const linkedPairFile = this.getVaultFileByPathFlexible(linkedPairPath);
            if (linkedPairFile instanceof TFile) return linkedPairFile;
        }

        return this.isPathInBasePath(file.path)
            ? this.findCompanionNoteForSourceFile(file)
            : this.isPathInBfmNewFileLocation(file.path)
                ? this.findSourceFileForCompanionNote(file.path)
                : null;
    }

    getFileContext(file: TFile): AutotagFileContext {
        const isWatchedSource = file.extension.toLowerCase() !== "md" && this.isPathInBasePath(file.path);
        const isCompanionNote = file.extension.toLowerCase() === "md" && this.isPathInBfmNewFileLocation(file.path);
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
            const resolved = this.getVaultFileByPathFlexible(directPair.imagePath);
            if (resolved instanceof TFile) sourceFile = resolved;
        }
        if (!companionNote && directPair?.notePath) {
            const resolved = this.getVaultFileByPathFlexible(directPair.notePath);
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

    createAutotagContextMenuTitle(title: string, className: string): DocumentFragment {
        const fragment = document.createDocumentFragment();
        const titleEl = document.createElement("span");
        titleEl.classList.add(className);
        titleEl.textContent = title;
        fragment.appendChild(titleEl);
        return fragment;
    }

    addAutotagMenuLabel(menu: Menu, title: string, icon: string): void {
        menu.addItem(item => item
            .setTitle(this.createAutotagContextMenuTitle(title, "autotag-context-menu-heading"))
            .setIcon(icon)
            .setIsLabel(true));
    }

    addAutotagMenuItem(
        menu: Menu,
        title: string,
        icon: string,
        disabled: boolean,
        onClick: () => void | Promise<void>,
        warning = false
    ): void {
        menu.addItem(item => {
            item
                .setTitle(this.createAutotagContextMenuTitle(title, "autotag-context-menu-action"))
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
        const path = file instanceof TFile ? file.path.trim() : "";
        const currentFile = path ? this.app.vault.getFileByPath(path) : null;
        if (!(currentFile instanceof TFile)) {
            new Notice(emptyNotice);
            return;
        }
        try {
            await this.app.workspace.getLeaf(false).openFile(currentFile);
        } catch (error) {
            console.warn("Autotag could not open a context file", path, error);
            new Notice(`Could not open ${currentFile.name}. The file may have moved or been deleted.`);
        }
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
            new Notice("No source file path found for this Autotag item.");
            return;
        }
        const before = this.settings.processedFiles.length;
        this.settings.processedFiles = this.settings.processedFiles.filter(path => !this.areVaultPathsSame(path, sourcePath));
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

    populateAutotagFileSubmenu(menu: Menu, file: TFile): void {
        menu.setUseNativeMenu(false);
        const context = this.getFileContext(file);
        const hasManagedContext = context.isWatchedSource || context.isCompanionNote || !!context.pairRecord;
        const hasPair = !!context.pairRecord;
        const hasSourceFile = context.sourceFile instanceof TFile;
        const hasCompanionNote = context.companionNote instanceof TFile;

        this.addAutotagMenuLabel(menu, "Health", "activity");
        this.addAutotagMenuItem(menu, "Open Health", "activity", false, () => this.openSettingsSection("health"));
        menu.addSeparator();

        this.addAutotagMenuLabel(menu, "Setup", "wrench");
        this.addAutotagMenuItem(menu, "Open Autotag Settings", "settings", false, () => this.openSettingsSection("setup"));
        menu.addSeparator();

        this.addAutotagMenuLabel(menu, "Processing & Queue", "list-checks");
        this.addAutotagMenuItem(menu, "Reprocess with Autotag", "refresh-cw", !hasSourceFile && !context.isCompanionNote, () => this.reprocessFileFromContext(file));
        menu.addSeparator();

        this.addAutotagMenuLabel(menu, "Duplicates", "copy-check");
        this.addAutotagMenuItem(menu, "Find duplicate pair", "search-check", !hasPair, () => this.showContextPairInfo(file));
        this.addAutotagMenuItem(menu, "Copy pair ID", "fingerprint", !context.pairRecord?.pairId, () => this.copyContextValueToClipboard(context.pairRecord?.pairId, "Pair ID copied.", "No pair ID found for this file."));
        this.addAutotagMenuItem(menu, "Copy image path", "image", !context.sourcePath, () => this.copyContextValueToClipboard(context.sourcePath, "Image path copied.", "No image path found for this file."));
        this.addAutotagMenuItem(menu, "Copy companion path", "file-text", !context.companionPath, () => this.copyContextValueToClipboard(context.companionPath, "Companion path copied.", "No companion path found for this file."));
        this.addAutotagMenuItem(menu, "Open Duplicates settings", "copy-check", false, () => this.openSettingsSection("duplicates"));
        menu.addSeparator();

        this.addAutotagMenuLabel(menu, "Fix / Recover", "wrench");
        this.addAutotagMenuItem(menu, "Forget processed state", "eraser", !context.sourcePath, () => this.forgetProcessedStateForContext(file));
        this.addAutotagMenuItem(menu, "Clear failed state", "circle-x", !hasManagedContext, () => this.clearFailedStateForContext(file));
        this.addAutotagMenuItem(menu, "Create missing companion note", "file-plus", !hasSourceFile, () => this.createMissingCompanionFromContext(file));
        this.addAutotagMenuItem(menu, "Open Fix / Recover settings", "wrench", false, () => this.openSettingsSection("fix-recover"));
        menu.addSeparator();

        this.addAutotagMenuLabel(menu, "QoL", "sliders-horizontal");
        this.addAutotagMenuItem(menu, "Open companion note", "file-text", !hasCompanionNote, () => this.openContextFile(context.companionNote, "No companion note found for this file."));
        this.addAutotagMenuItem(menu, "Open source image", "image", !hasSourceFile, () => this.openContextFile(context.sourceFile, "No source image found for this file."));
        this.addAutotagMenuItem(menu, "Move selected file", "folder-input", this.isPathProcessing(file.path), () => this.moveAffectedFilesToChosenFolder([file], "selected file", "Context Menu"));
        this.addAutotagMenuItem(menu, "Delete linked pair", "trash-2", !hasSourceFile || !hasCompanionNote, () => this.deleteLinkedPairFromContext(file), true);
    }

    addAutotagFileContextMenu(menu: Menu, file: TFile): void {
        menu.addSeparator();
        menu.addItem(item => {
            item
                .setTitle("Autotag")
                .setIcon("sparkles");
            const menuItem = item as unknown as {
                setSubmenu?: (submenu?: Menu) => Menu | void;
            };
            if (typeof menuItem.setSubmenu === "function") {
                try {
                    const nativeSubmenu = menuItem.setSubmenu();
                    if (nativeSubmenu instanceof Menu) {
                        this.populateAutotagFileSubmenu(nativeSubmenu, file);
                        return;
                    }
                } catch (_) {
                    // Fall through to the alternate submenu shape below.
                }
                try {
                    const submenu = new Menu();
                    submenu.setUseNativeMenu(false);
                    this.populateAutotagFileSubmenu(submenu, file);
                    menuItem.setSubmenu(submenu);
                    return;
                } catch (_) {
                    // Fall through to click-open fallback.
                }
            }
            item.onClick(event => {
                const submenu = new Menu();
                submenu.setUseNativeMenu(false);
                this.populateAutotagFileSubmenu(submenu, file);
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

    hasPathInSet(set: Set<string>, path: string): boolean {
        if (set.has(path)) return true;
        const pathKey = this.getVaultPathKey(path);
        for (const existingPath of set.values()) {
            if (this.getVaultPathKey(existingPath) === pathKey) return true;
        }
        return false;
    }

    deletePathFromSet(set: Set<string>, path: string): boolean {
        let deleted = set.delete(path);
        const pathKey = this.getVaultPathKey(path);
        for (const existingPath of Array.from(set.values())) {
            if (this.getVaultPathKey(existingPath) === pathKey) {
                set.delete(existingPath);
                deleted = true;
            }
        }
        return deleted;
    }

    suppressDeletedPath(path: string, runId: string | null = this.getPathKeyValue(this.currentRunIds, path) ?? null): void {
        this.deletionSuppressedPaths.add(path);
        this.deletionSuppressedRunIds.set(path, runId);
    }

    isDeletionSuppressed(path: string, runId?: string): boolean {
        if (!this.hasPathInSet(this.deletionSuppressedPaths, path)) return false;
        if (!runId) return true;
        const suppressedRunId = this.getPathKeyValue(this.deletionSuppressedRunIds, path);
        return !suppressedRunId || suppressedRunId === runId;
    }

    clearDeletionSuppression(path: string): void {
        this.deletePathFromSet(this.deletionSuppressedPaths, path);
        this.deletePathKey(this.deletionSuppressedRunIds, path);
    }

    suppressDeletedPair(file: TFile, linkedFile: TFile | null): void {
        const activePair = this.getActiveRunPairForPath(file.path) ?? (linkedFile instanceof TFile ? this.getActiveRunPairForPath(linkedFile.path) : null);
        const runId = activePair?.runId ?? this.getPathKeyValue(this.currentRunIds, file.path) ?? null;
        this.suppressDeletedPath(file.path, runId);
        if (linkedFile instanceof TFile) this.suppressDeletedPath(linkedFile.path, runId);
    }


    async deleteLinkedCompanionOrSource(file: TFile, linkedFile: TFile | null = this.getLinkedFileForDeletion(file)): Promise<void> {
        if (this.hasPathInSet(this.deletionCascadePaths, file.path)) return;
        if (!(linkedFile instanceof TFile)) return;
        const linkedPath = linkedFile.path;
        if (!(this.getVaultFileByPathFlexible(linkedPath) instanceof TFile)) return;

        this.deletionCascadePaths.add(linkedPath);
        const activePair = this.getActiveRunPairForPath(file.path) ?? this.getActiveRunPairForPath(linkedPath);
        this.suppressDeletedPath(linkedPath, activePair?.runId ?? null);
        try {
            await this.app.vault.delete(linkedFile);
            new Notice(`Autotag deleted linked file: ${linkedPath}`);
        } finally {
            window.setTimeout(() => this.deletePathFromSet(this.deletionCascadePaths, linkedPath), 1000);
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
        const activeRunId = this.getPathKeyValue(this.currentRunIds, filePath);
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
        const note = this.getVaultFileByPathFlexible(notePath);
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
        const image = this.getVaultFileByPathFlexible(normalizedImagePath);
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
        return !this.areVaultPathsSame(cleanPath, file.path) && !(this.getVaultFileByPathFlexible(cleanPath) instanceof TFile) ? cleanPath : null;
    }

    async autorenameReplacedDuplicate(file: TFile, note: TFile): Promise<{ file: TFile; note: TFile }> {
        let currentFile = file;
        let currentNote = note;
        const cleanImagePath = this.getAutorenameImagePath(currentFile);
        if (cleanImagePath) {
            const renamedFile = await this.renameFileWithoutLinkedCascade(currentFile, cleanImagePath);
            if (renamedFile instanceof TFile) currentFile = renamedFile;
        }

        const cleanNotePath = this.getCompanionNotePath(currentFile);
        if (!this.areVaultPathsSame(currentNote.path, cleanNotePath) && !(this.getVaultFileByPathFlexible(cleanNotePath) instanceof TFile)) {
            const renamedNote = await this.renameFileWithoutLinkedCascade(currentNote, cleanNotePath);
            if (renamedNote instanceof TFile) currentNote = renamedNote;
        }

        return { file: currentFile, note: currentNote };
    }

    async deleteFileWithoutLinkedCascade(file: TFile | null, runId?: string): Promise<void> {
        if (!(file instanceof TFile)) return;
        const filePath = file.path;
        if (!(this.getVaultFileByPathFlexible(filePath) instanceof TFile)) return;
        this.deletionCascadePaths.add(filePath);
        this.suppressDeletedPath(filePath, runId);
        try {
            await this.app.vault.delete(file);
        } finally {
            window.setTimeout(() => this.deletePathFromSet(this.deletionCascadePaths, filePath), 1000);
            window.setTimeout(() => this.clearDeletionSuppression(filePath), 5000);
        }
    }

    async renameFileWithoutLinkedCascade(file: TFile, newPath: string): Promise<TFile | null> {
        this.deletionCascadePaths.add(file.path);
        this.suppressDeletedPath(file.path);
        try {
            await this.app.vault.rename(file, newPath);
        } finally {
            window.setTimeout(() => this.deletePathFromSet(this.deletionCascadePaths, file.path), 1000);
        }
        const renamed = this.getVaultFileByPathFlexible(newPath);
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
            window.setTimeout(() => this.deletePathFromSet(this.deletionCascadePaths, filePath), 1000);
            window.setTimeout(() => this.deletePathFromSet(this.deletionCascadePaths, notePath), 1000);
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
        const oldImage = this.getVaultFileByPathFlexible(oldImagePath);
        const oldNote = this.getVaultFileByPathFlexible(oldNotePath);
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
                expectedNotePath: this.getCompanionNotePath(kept.file),
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
        const oldImage = this.getVaultFileByPathFlexible(oldImagePath);
        const oldNote = this.getVaultFileByPathFlexible(oldNotePath);

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
                    const currentFile = this.getVaultFileByPathFlexible(newImagePath);
                    const currentNote = this.getVaultFileByPathFlexible(newNotePath);

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
                    console.error("Autotag duplicate decision failed after processing", error);
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

        let notePath = this.getCompanionNotePath(file);
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
            notePath = this.getCompanionNotePath(file);
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
                console.log("Autotag duplicate detected; continuing processing while decision popup is open.", {
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

    normalizeFolderPropertyValueForMatching(value: string): string {
        let normalized = value
            .trim()
            .replace(/^-\s*/, "")
            .replace(/^"+|"+$/g, "")
            .replace(/^\'+|\'+$/g, "")
            .trim();
        const wikiMatch = normalized.match(/^!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
        if (wikiMatch) {
            const target = (wikiMatch[2] || wikiMatch[1]).trim();
            normalized = target.split("/").pop()?.replace(/\.md$/i, "").trim() || target;
        }
        return normalized;
    }

    extractFolderPropertyValuesFromRawValue(rawValue: unknown): string[] {
        const rawValues: string[] = [];
        const collect = (value: unknown) => {
            if (Array.isArray(value)) {
                value.forEach(collect);
                return;
            }
            if (typeof value === "string") {
                value
                    .split(",")
                    .map(part => part.trim())
                    .filter(Boolean)
                    .forEach(part => rawValues.push(part));
                return;
            }
            if (typeof value === "number" && Number.isFinite(value)) {
                rawValues.push(String(value));
            }
        };

        collect(rawValue);
        return rawValues
            .map(value => this.normalizeFolderPropertyValueForMatching(value))
            .filter(Boolean);
    }

    getFrontmatterPropertyValuesForFolderMapping(frontmatter: Record<string, unknown>, property: string): string[] {
        const normalizedProperty = property.trim().toLowerCase();
        if (!normalizedProperty) return [];

        const values: string[] = [];
        Object.keys(frontmatter).forEach(key => {
            if (key.trim().toLowerCase() !== normalizedProperty) return;
            values.push(...this.extractFolderPropertyValuesFromRawValue(frontmatter[key]));
        });

        return values;
    }

    uniqueFolderMappingValues(values: string[]): string[] {
        const seen = new Set<string>();
        const output: string[] = [];
        values.forEach(value => {
            const normalized = this.normalizeFolderPropertyValueForMatching(value);
            const key = normalized.toLowerCase();
            if (!normalized || seen.has(key)) return;
            seen.add(key);
            output.push(normalized);
        });
        return output.sort((a, b) => a.localeCompare(b));
    }

    getAutomaticFolderPropertyValues(property: string): string[] {
        const values: string[] = [];
        this.app.vault.getMarkdownFiles().forEach(file => {
            const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
            if (!frontmatter) return;
            values.push(...this.getFrontmatterPropertyValuesForFolderMapping(frontmatter, property));
        });
        return this.uniqueFolderMappingValues(values);
    }

    syncAutomaticFolderPropertyMapping(mapping: FolderPropertyMapping, replaceValues = true): boolean {
        if (mapping.valueSource !== "automatic") return false;
        const detectedValues = this.getAutomaticFolderPropertyValues(mapping.property);
        const nextValues = replaceValues
            ? detectedValues
            : this.uniqueFolderMappingValues([...mapping.values, ...detectedValues]);
        if (nextValues.join("\n") === mapping.values.join("\n")) return false;
        mapping.values = nextValues;
        return true;
    }

    async syncAutomaticFolderPropertyMappings(replaceValues = true): Promise<void> {
        let changed = false;
        this.settings.folderPropertyMappings.forEach(mapping => {
            if (this.syncAutomaticFolderPropertyMapping(mapping, replaceValues)) changed = true;
        });
        if (changed) {
            await this.saveSettings();
            this.settingTab?.refreshFolderPropertyValuesIfVisible();
        }
    }

    scheduleAutomaticFolderPropertySync(delayMs = 600): void {
        if (this.automaticFolderPropertySyncTimer !== null) {
            window.clearTimeout(this.automaticFolderPropertySyncTimer);
        }
        this.automaticFolderPropertySyncTimer = window.setTimeout(() => {
            this.automaticFolderPropertySyncTimer = null;
            void this.syncAutomaticFolderPropertyMappings(true);
        }, delayMs);
    }

    async syncAutomaticFolderPropertyMappingsFromFile(file: TFile): Promise<void> {
        if (file.extension !== "md") return;
        if (!this.settings.folderPropertyMappings.some(mapping => mapping.valueSource === "automatic")) return;
        this.scheduleAutomaticFolderPropertySync();
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

    getVocabularyRecordsForFile(
        file: TFile,
        frontmatterOverride?: Record<string, unknown> | null
    ): VaultVocabularyRecord[] {
        if (file.extension !== "md") return [];

        const frontmatter = frontmatterOverride === undefined
            ? this.app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined
            : frontmatterOverride ?? undefined;
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

    hasVaultVocabularySources(): boolean {
        return this.settings.vaultAwarenessEnabled
            && this.getVaultAwarenessCandidateProperties().length > 0;
    }

    clearVaultVocabularyCache(): void {
        this.vocabularyByFile.clear();
        this.vaultVocabulary.clear();
        this.vaultAliasToCanonical.clear();
        this.vaultVocabularyCacheDirty = false;
    }

    scheduleVaultVocabularyCacheBuild(delayMs = 1000): void {
        if (this.vaultVocabularyBuildTimer !== null) {
            window.clearTimeout(this.vaultVocabularyBuildTimer);
            this.vaultVocabularyBuildTimer = null;
        }
        const generation = ++this.vaultVocabularyBuildGeneration;
        this.vaultVocabularyCacheDirty = true;

        if (!this.hasVaultVocabularySources()) {
            this.clearVaultVocabularyCache();
            return;
        }

        this.vaultVocabularyBuildTimer = window.setTimeout(() => {
            this.vaultVocabularyBuildTimer = null;
            void this.runVaultVocabularyCacheBuild(generation);
        }, delayMs);
    }

    async runVaultVocabularyCacheBuild(generation: number): Promise<void> {
        const build = this.buildVaultVocabularyCacheInChunks(generation);
        this.vaultVocabularyBuildPromise = build;
        try {
            await build;
            if (generation === this.vaultVocabularyBuildGeneration) {
                this.vaultVocabularyCacheDirty = false;
            }
        } finally {
            if (this.vaultVocabularyBuildPromise === build) {
                this.vaultVocabularyBuildPromise = null;
            }
        }
    }

    async ensureVaultVocabularyCacheReady(): Promise<void> {
        if (!this.hasVaultVocabularySources()) {
            this.clearVaultVocabularyCache();
            return;
        }

        if (this.vaultVocabularyBuildTimer !== null) {
            window.clearTimeout(this.vaultVocabularyBuildTimer);
            this.vaultVocabularyBuildTimer = null;
        }

        while (this.vaultVocabularyCacheDirty || this.vaultVocabularyBuildPromise) {
            if (this.vaultVocabularyBuildPromise) {
                await this.vaultVocabularyBuildPromise;
                continue;
            }
            const generation = ++this.vaultVocabularyBuildGeneration;
            await this.runVaultVocabularyCacheBuild(generation);
        }
    }

    async buildVaultVocabularyCacheInChunks(generation: number): Promise<void> {
        if (!this.hasVaultVocabularySources()) {
            this.clearVaultVocabularyCache();
            return;
        }

        const nextByFile = new Map<string, VaultVocabularyRecord[]>();
        const files = this.app.vault.getMarkdownFiles();

        for (let index = 0; index < files.length; index += 1) {
            if (generation !== this.vaultVocabularyBuildGeneration) return;

            const file = files[index];
            const frontmatter = await this.readVaultVocabularyFrontmatter(file);
            const records = this.getVocabularyRecordsForFile(file, frontmatter);
            if (records.length > 0) {
                nextByFile.set(file.path, records);
            }

            if ((index + 1) % 100 === 0) {
                await this.sleep(0);
            }
        }

        if (generation !== this.vaultVocabularyBuildGeneration) return;
        this.vocabularyByFile = nextByFile;
        this.rebuildVaultVocabularyAggregate();
    }

    async readVaultVocabularyFrontmatter(file: TFile): Promise<Record<string, unknown> | null> {
        try {
            const content = await this.app.vault.cachedRead(file);
            const info = getFrontMatterInfo(content);
            if (!info.exists || !info.frontmatter.trim()) return null;
            const parsed = parseYaml(info.frontmatter);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? parsed as Record<string, unknown>
                : null;
        } catch (error) {
            console.warn("Autotag could not read current frontmatter for Vault Awareness", file.path, error);
            const cached = this.app.metadataCache.getFileCache(file)?.frontmatter;
            return cached && typeof cached === "object"
                ? cached as Record<string, unknown>
                : null;
        }
    }

    indexVocabularyFile(file: TFile, frontmatterOverride?: Record<string, unknown> | null): void {
        if (file.extension !== "md") return;
        if (!this.hasVaultVocabularySources()) {
            this.clearVaultVocabularyCache();
            return;
        }

        const records = this.getVocabularyRecordsForFile(file, frontmatterOverride);
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
        if (!this.hasVaultVocabularySources()) {
            this.clearVaultVocabularyCache();
            return;
        }

        this.vocabularyByFile.clear();

        this.app.vault.getMarkdownFiles().forEach(file => {
            const records = this.getVocabularyRecordsForFile(file);
            if (records.length > 0) {
                this.vocabularyByFile.set(file.path, records);
            }
        });

        this.rebuildVaultVocabularyAggregate();
        this.vaultVocabularyCacheDirty = false;
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
            if (stem.endsWith(suffix) && stem.length - suffix.length >= 4) {
                stem = stem.slice(0, -suffix.length);
                break;
            }
        }

        if (stem.endsWith("y") && stem.length > 4) {
            stem = stem.slice(0, -1);
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

    normalizeLearnedRelationPhrase(value: string): string {
        return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).join(" ");
    }

    hasLearnedRelationEvidence(evidence: string, evidenceText: string): boolean {
        const normalizedEvidence = this.normalizeLearnedRelationPhrase(evidence);
        const normalizedText = this.normalizeLearnedRelationPhrase(evidenceText);
        return normalizedEvidence.length > 0
            && normalizedText.length > 0
            && ` ${normalizedText} `.includes(` ${normalizedEvidence} `);
    }

    getLearnedRelationEditDistance(left: string, right: string): number {
        const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
        for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
            const current = [leftIndex];
            for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
                current[rightIndex] = Math.min(
                    current[rightIndex - 1] + 1,
                    previous[rightIndex] + 1,
                    previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
                );
            }
            previous.splice(0, previous.length, ...current);
        }
        return previous[right.length];
    }

    isLearnedVaultRelationStructurallyPlausible(evidence: string, candidate: string, relationType: string): boolean {
        const evidenceWords = evidence.toLowerCase().match(/[a-z0-9]+/g) ?? [];
        const candidateWords = candidate.toLowerCase().match(/[a-z0-9]+/g) ?? [];
        const evidenceCompact = evidenceWords.join("");
        const candidateCompact = candidateWords.join("");
        if (!evidenceCompact || !candidateCompact || evidenceCompact === candidateCompact) return false;

        if (relationType === "synonym" || relationType === "broader-narrower") return true;
        if (relationType === "compound") {
            const shorter = evidenceCompact.length <= candidateCompact.length ? evidenceCompact : candidateCompact;
            const longer = evidenceCompact.length > candidateCompact.length ? evidenceCompact : candidateCompact;
            return shorter.length >= 4 && longer.includes(shorter);
        }
        if (relationType === "acronym") {
            const evidenceInitials = evidenceWords.map(word => word[0]).join("");
            const candidateInitials = candidateWords.map(word => word[0]).join("");
            return (evidenceCompact.length >= 2 && evidenceCompact === candidateInitials)
                || (candidateCompact.length >= 2 && candidateCompact === evidenceInitials);
        }
        if (relationType === "spelling") {
            const longestLength = Math.max(evidenceCompact.length, candidateCompact.length);
            const allowedDistance = Math.max(1, Math.min(3, Math.floor(longestLength * 0.25)));
            return this.getLearnedRelationEditDistance(evidenceCompact, candidateCompact) <= allowedDistance;
        }
        if (relationType === "word-family") {
            const shorter = evidenceCompact.length <= candidateCompact.length ? evidenceCompact : candidateCompact;
            const longer = evidenceCompact.length > candidateCompact.length ? evidenceCompact : candidateCompact;
            if (shorter.length < 3) return false;
            let sharedPrefixLength = 0;
            while (sharedPrefixLength < shorter.length && shorter[sharedPrefixLength] === longer[sharedPrefixLength]) {
                sharedPrefixLength++;
            }
            const requiredPrefixLength = Math.max(3, Math.ceil(shorter.length * 0.65));
            const maximumLengthDifference = Math.max(3, Math.ceil(shorter.length * 0.5));
            return sharedPrefixLength >= requiredPrefixLength
                && longer.length - shorter.length <= maximumLengthDifference;
        }
        return false;
    }

    getLearnedVaultRelationConfidence(
        relationType: string,
        model: string,
        requestedConfidence: unknown,
        confirmations: number
    ): number {
        const parsedConfidence = Number(requestedConfidence);
        if (Number.isFinite(parsedConfidence)) {
            return this.clampSetting(Math.round(parsedConfidence), 0, 0, 100);
        }

        const normalizedType = relationType.toLowerCase();
        const isLocalStructuralMatch = model.toLowerCase().includes("structural matcher");
        let baseConfidence = 70;
        if (isLocalStructuralMatch) {
            if (normalizedType === "word-family") baseConfidence = 94;
            else if (normalizedType === "spelling") baseConfidence = 92;
            else if (normalizedType === "acronym") baseConfidence = 90;
            else if (normalizedType === "compound") baseConfidence = 88;
            else baseConfidence = 85;
        } else if (normalizedType === "synonym") {
            baseConfidence = 76;
        } else if (normalizedType === "broader-narrower") {
            baseConfidence = 72;
        } else if (["word-family", "spelling", "acronym", "compound"].includes(normalizedType)) {
            baseConfidence = 84;
        }
        return Math.min(100, baseConfidence + Math.min(12, Math.max(0, confirmations - 1) * 4));
    }

    getVaultRelationshipPairKey(evidence: string, candidate: string): string {
        return `${this.normalizeAiTagName(evidence).toLowerCase()}\n${this.normalizeAiTagName(candidate).toLowerCase()}`;
    }

    rebuildVaultRelationshipIndexes(): void {
        this.learnedVaultRelationsByCandidate.clear();
        this.learnedVaultRelationsByPair.clear();
        this.rejectedVaultRelationsByPair.clear();
        this.settings.learnedVaultRelations.forEach(relation => {
            const candidateKey = relation.candidate.toLowerCase();
            const candidateRelations = this.learnedVaultRelationsByCandidate.get(candidateKey) ?? [];
            candidateRelations.push(relation);
            this.learnedVaultRelationsByCandidate.set(candidateKey, candidateRelations);
            this.learnedVaultRelationsByPair.set(
                this.getVaultRelationshipPairKey(relation.evidence, relation.candidate),
                relation
            );
        });
        this.settings.rejectedVaultRelations.forEach(relation => {
            this.rejectedVaultRelationsByPair.set(
                this.getVaultRelationshipPairKey(relation.evidence, relation.candidate),
                relation
            );
        });
    }

    async persistVaultRelationshipChanges(): Promise<void> {
        this.rebuildVaultRelationshipIndexes();
        await this.saveSettings();
        await this.syncLearnedVaultRelationsNote();
    }

    pruneLearnedVaultRelations(): number {
        const before = this.settings.learnedVaultRelations.length;
        this.settings.learnedVaultRelations = this.settings.learnedVaultRelations
            .filter(relation => relation.confidence >= this.settings.learnedVaultRelationMinimumConfidence)
            .sort((a, b) => {
                if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                if (a.confidence !== b.confidence) return b.confidence - a.confidence;
                return Math.max(b.lastUsedAt, b.lastConfirmedAt) - Math.max(a.lastUsedAt, a.lastConfirmedAt);
            })
            .slice(0, this.settings.learnedVaultRelationCacheLimit);
        this.rebuildVaultRelationshipIndexes();
        return before - this.settings.learnedVaultRelations.length;
    }

    isLearnedVaultRelationReusable(relation: LearnedVaultRelation): boolean {
        if (relation.confidence < this.settings.learnedVaultRelationMinimumConfidence) return false;
        if (!this.isLearnedVaultRelationStructurallyPlausible(relation.evidence, relation.candidate, relation.relationType)) return false;
        return (relation.relationType !== "synonym" && relation.relationType !== "broader-narrower")
            || relation.confirmations >= 2;
    }

    getOrderedVaultEvidencePhrases(
        folderCandidates: string[],
        filenameCandidates: string[],
        geolocationContextText: string,
        baseTags: string[],
        aiDescription: string
    ): string[] {
        return [
            ...folderCandidates,
            ...filenameCandidates,
            geolocationContextText,
            ...baseTags,
            aiDescription,
        ]
            .map(value => value.trim())
            .filter(Boolean);
    }

    getExactVaultEvidence(candidate: string, evidencePhrases: string[]): string | null {
        return evidencePhrases.find(evidence => this.hasLearnedRelationEvidence(candidate, evidence)) ?? null;
    }

    getAliasVaultEvidence(candidate: string, evidencePhrases: string[]): string | null {
        if (!this.settings.vaultMatchingTiers.aliases || this.settings.vaultLinguisticFeatures.vaultAliases === "exclude") return null;
        for (const alias of this.getVaultTermAliases(candidate)) {
            const evidence = evidencePhrases.find(phrase => this.hasLearnedRelationEvidence(alias, phrase));
            if (evidence) return alias;
        }
        return null;
    }

    getLearnedVaultEvidence(candidate: string, evidenceText: string): string | null {
        if (!this.settings.selfLearningBridgeEnabled || !this.settings.vaultMatchingTiers.learned) return null;
        const relation = (this.learnedVaultRelationsByCandidate.get(candidate.toLowerCase()) ?? []).find(entry =>
            this.isLearnedVaultRelationReusable(entry)
            && this.hasLearnedRelationEvidence(entry.evidence, evidenceText)
        );
        if (relation) relation.lastUsedAt = Date.now();
        return relation?.evidence ?? null;
    }

    getStructuralVaultRelationType(evidence: string, candidate: string): string | null {
        const structuralTypes = ["word-family", "compound", "spelling", "acronym"];
        const featureAllows = (type: string) => {
            if (type === "word-family") return this.settings.vaultLinguisticFeatures.grammaticalVariants !== "exclude";
            if (type === "compound") return this.settings.vaultLinguisticFeatures.compoundDecomposition !== "exclude";
            if (type === "spelling") return this.settings.vaultLinguisticFeatures.spellingVariants !== "exclude";
            if (type === "acronym") return this.settings.vaultLinguisticFeatures.acronymsAbbreviations !== "exclude";
            return false;
        };
        return structuralTypes.find(type =>
            featureAllows(type)
            && this.isLearnedVaultRelationStructurallyPlausible(evidence, candidate, type)
        ) ?? null;
    }

    getBasicInflectionStems(word: string): Set<string> {
        const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, "");
        const stems = new Set<string>([normalized]);
        if (normalized.endsWith("ies") && normalized.length > 4) stems.add(`${normalized.slice(0, -3)}y`);
        if (normalized.endsWith("es") && normalized.length > 4) stems.add(normalized.slice(0, -2));
        if (normalized.endsWith("s") && !normalized.endsWith("ss") && normalized.length > 3) stems.add(normalized.slice(0, -1));
        if (normalized.endsWith("ing") && normalized.length > 5) {
            const stem = normalized.slice(0, -3);
            stems.add(stem);
            if (stem.length > 3 && stem[stem.length - 1] === stem[stem.length - 2]) stems.add(stem.slice(0, -1));
        }
        if (normalized.endsWith("ed") && normalized.length > 4) {
            const stem = normalized.slice(0, -2);
            stems.add(stem);
            stems.add(`${stem}e`);
            if (stem.length > 3 && stem[stem.length - 1] === stem[stem.length - 2]) stems.add(stem.slice(0, -1));
        }
        return stems;
    }

    getStrongLocalStructuralVaultRelation(evidence: string, candidate: string): Omit<LocalStructuralRelation, "evidence" | "evidenceChannelCount"> | null {
        const evidenceWords = evidence.toLowerCase().match(/[a-z0-9]+/g) ?? [];
        const candidateWords = candidate.toLowerCase().match(/[a-z0-9]+/g) ?? [];
        if (evidenceWords.length !== 1 || candidateWords.length !== 1) return null;

        const evidenceWord = evidenceWords[0];
        const candidateWord = candidateWords[0];
        const evidenceStem = this.getWordVariantStem(evidenceWord);
        const candidateStem = this.getWordVariantStem(candidateWord);
        const aToIcVariant = (noun: string, adjective: string) => noun.endsWith("a")
            && adjective.endsWith("ic")
            && noun.length >= 5
            && noun.slice(0, -1) === adjective.slice(0, -2);
        const stemsMatch = evidenceStem.length >= 4 && evidenceStem === candidateStem;
        const nounAdjectiveMatch = aToIcVariant(evidenceWord, candidateWord)
            || aToIcVariant(candidateWord, evidenceWord);
        if ((!stemsMatch && !nounAdjectiveMatch) || evidenceWord === candidateWord) return null;

        const evidenceInflectionStems = this.getBasicInflectionStems(evidenceWord);
        const candidateInflectionStems = this.getBasicInflectionStems(candidateWord);
        const isBasicInflection = Array.from(evidenceInflectionStems).some(stem =>
            stem.length >= 3 && candidateInflectionStems.has(stem)
        );
        return {
            relationType: "word-family",
            requiresCorroboration: !isBasicInflection,
        };
    }

    getStrongLocalStructuralEvidence(candidate: string, evidencePhrases: string[]): Omit<LocalStructuralRelation, "evidenceChannelCount"> | null {
        for (const evidence of evidencePhrases) {
            const words = this.normalizeAiTagName(evidence).match(/[A-Za-z0-9]+/g) ?? [];
            const evidenceOptions = [evidence, ...words.filter(word => word.length >= 3)];
            for (const option of evidenceOptions) {
                const relation = this.getStrongLocalStructuralVaultRelation(option, candidate);
                if (relation) return { evidence: option, ...relation };
            }
        }
        return null;
    }

    getLocallyAcceptedStructuralRelation(
        candidate: string,
        folderCandidates: string[],
        filenameCandidates: string[],
        geolocationContextText: string,
        baseTags: string[],
        aiDescription: string
    ): LocalStructuralRelation | null {
        const channels = [
            folderCandidates,
            filenameCandidates,
            geolocationContextText.trim() ? [geolocationContextText] : [],
            baseTags,
            aiDescription.trim() ? [aiDescription] : [],
        ];
        const channelMatches = channels
            .map(channel => this.getStrongLocalStructuralEvidence(candidate, channel))
            .filter((match): match is Omit<LocalStructuralRelation, "evidenceChannelCount"> => !!match);
        if (channelMatches.length === 0) return null;

        const preferred = channelMatches[0];
        if (preferred.requiresCorroboration && channelMatches.length < 2) return null;
        return {
            ...preferred,
            evidenceChannelCount: channelMatches.length,
        };
    }

    getStructuralVaultEvidence(candidate: string, evidencePhrases: string[]): string | null {
        for (const evidence of evidencePhrases) {
            const words = this.normalizeAiTagName(evidence).match(/[A-Za-z0-9]+/g) ?? [];
            const evidenceOptions = [evidence, ...words.filter(word => word.length >= 3)];
            for (const option of evidenceOptions) {
                if (this.getStructuralVaultRelationType(option, candidate)) return option;
            }
        }
        return null;
    }

    isRejectedVaultRelationship(evidence: string, candidate: string): boolean {
        const now = Date.now();
        const relation = this.rejectedVaultRelationsByPair.get(this.getVaultRelationshipPairKey(evidence, candidate));
        return !!relation && relation.rejectedAt >= now - REJECTED_VAULT_RELATION_TTL_MS;
    }

    buildVaultCandidateMatches(
        rankedTerms: string[],
        folderCandidates: string[],
        filenameCandidates: string[],
        geolocationContextText: string,
        baseTags: string[],
        aiDescription: string,
        semanticHints: string[]
    ): VaultCandidateMatch[] {
        const evidencePhrases = this.getOrderedVaultEvidencePhrases(
            folderCandidates,
            filenameCandidates,
            geolocationContextText,
            baseTags,
            aiDescription
        );
        const evidenceText = evidencePhrases.join(" ");
        const matches: VaultCandidateMatch[] = [];

        rankedTerms.forEach((candidate, rank) => {
            const exactEvidence = this.getExactVaultEvidence(candidate, evidencePhrases);
            if (exactEvidence) {
                if (this.settings.vaultMatchingTiers.exact) {
                    matches.push({ candidate, evidence: candidate, tier: "exact", score: 1000 - rank });
                }
                return;
            }

            const aliasEvidence = this.getAliasVaultEvidence(candidate, evidencePhrases);
            if (aliasEvidence) {
                matches.push({ candidate, evidence: aliasEvidence, tier: "aliases", score: 900 - rank });
                return;
            }

            const learnedEvidence = this.getLearnedVaultEvidence(candidate, evidenceText);
            if (learnedEvidence) {
                matches.push({ candidate, evidence: learnedEvidence, tier: "learned", score: 800 - rank });
                return;
            }

            const structuralEvidence = this.getStructuralVaultEvidence(candidate, evidencePhrases);
            if (structuralEvidence) {
                const isStrongLocalMatch = !!this.getLocallyAcceptedStructuralRelation(
                    candidate,
                    folderCandidates,
                    filenameCandidates,
                    geolocationContextText,
                    baseTags,
                    aiDescription
                );
                if (this.settings.selfLearningBridgeEnabled
                    && this.settings.vaultMatchingTiers.structural
                    && (isStrongLocalMatch || !this.isRejectedVaultRelationship(structuralEvidence, candidate))) {
                    matches.push({ candidate, evidence: structuralEvidence, tier: "structural", score: 700 - rank });
                }
                return;
            }

            if (!this.settings.selfLearningBridgeEnabled || !this.settings.vaultMatchingTiers.semantic) return;
            const hintEvidence = semanticHints.find(hint =>
                this.getTextMatchScore(candidate, hint, true, true) > 0
                || this.getVaultTermAliases(candidate).some(alias => this.getTextMatchScore(alias, hint, true, true) > 0)
            );
            const semanticEvidence = hintEvidence ?? baseTags[0] ?? aiDescription;
            if (!semanticEvidence || this.isRejectedVaultRelationship(semanticEvidence, candidate)) return;
            matches.push({ candidate, evidence: semanticEvidence, tier: "semantic", score: 600 - rank });
        });

        return matches
            .sort((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate))
            .slice(0, this.settings.maxPromptVocabularyTerms);
    }

    parseVaultCandidateSelections(
        content: string,
        promptItems: VaultCandidatePromptItem[]
    ): VaultCandidateSelection[] {
        const cleaned = this.stripThinkBlocks(content)
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
        const allowedIds = new Set(promptItems.map(item => item.id.toLowerCase()));
        try {
            const jsonStart = cleaned.indexOf("{");
            const jsonEnd = cleaned.lastIndexOf("}");
            if (jsonStart === -1 || jsonEnd === -1) return [];
            const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
            if (Array.isArray(parsed?.vaultSelections)) {
                const seen = new Set<string>();
                return parsed.vaultSelections
                    .filter((selection: unknown) => selection && typeof selection === "object")
                    .map((selection: { id?: unknown; evidence?: unknown; type?: unknown; confidence?: unknown }) => ({
                        id: typeof selection.id === "string" ? selection.id.trim().toLowerCase() : "",
                        evidence: typeof selection.evidence === "string" ? this.normalizeAiTagName(selection.evidence).slice(0, 160) : "",
                        relationType: typeof selection.type === "string" && selection.type.trim()
                            ? selection.type.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40)
                            : "related",
                        confidence: Number.isFinite(Number(selection.confidence))
                            ? this.clampSetting(selection.confidence, 0, 0, 100)
                            : undefined,
                    }))
                    .filter((selection: VaultCandidateSelection) => {
                        if (!allowedIds.has(selection.id) || !selection.evidence || seen.has(selection.id)) return false;
                        seen.add(selection.id);
                        return true;
                    });
            }
        } catch {
            return [];
        }

        const legacyRelations = this.parseLearnedVaultRelations(content);
        const promptItemByCandidate = new Map(
            promptItems.map(item => [item.match.candidate.toLowerCase(), item])
        );
        const legacySelections: VaultCandidateSelection[] = [];
        this.normalizeUniqueAiTags(this.parseAiTags(content)).forEach(candidate => {
            const item = promptItemByCandidate.get(candidate.toLowerCase());
            const relation = legacyRelations.find(entry => entry.candidate.toLowerCase() === candidate.toLowerCase());
            if (!item || !relation) return;
            legacySelections.push({
                id: item.id,
                evidence: relation.evidence,
                relationType: relation.relationType,
                confidence: relation.confidence,
            });
        });
        return legacySelections;
    }

    parseLearnedVaultRelations(content: string): { evidence: string; candidate: string; relationType: string; confidence?: number }[] {
        const cleaned = this.stripThinkBlocks(content)
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
        try {
            const jsonStart = cleaned.indexOf("{");
            const jsonEnd = cleaned.lastIndexOf("}");
            if (jsonStart === -1 || jsonEnd === -1) return [];
            const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
            if (!Array.isArray(parsed?.relations)) return [];
            return parsed.relations
                .filter((relation: unknown) => relation && typeof relation === "object")
                .map((relation: { evidence?: unknown; candidate?: unknown; type?: unknown; confidence?: unknown }) => ({
                    evidence: typeof relation.evidence === "string" ? this.normalizeAiTagName(relation.evidence).slice(0, 160) : "",
                    candidate: typeof relation.candidate === "string" ? this.normalizeAiTagName(relation.candidate).slice(0, 160) : "",
                    relationType: typeof relation.type === "string" && relation.type.trim()
                        ? relation.type.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40)
                        : "related",
                    confidence: Number.isFinite(Number(relation.confidence))
                        ? this.clampSetting(relation.confidence, 0, 0, 100)
                        : undefined,
                }))
                .filter((relation: { evidence: string; candidate: string }) => relation.evidence && relation.candidate);
        } catch {
            return [];
        }
    }

    rememberLearnedVaultRelations(
        content: string,
        acceptedTerms: string[],
        evidenceText: string,
        model: string
    ): boolean {
        const accepted = new Set(acceptedTerms.map(term => term.toLowerCase()));
        const proposed = this.parseLearnedVaultRelations(content)
            .filter(relation => accepted.has(relation.candidate.toLowerCase()))
            .filter(relation => relation.evidence.toLowerCase() !== relation.candidate.toLowerCase())
            .filter(relation => this.isLearnedVaultRelationTypeEnabled(relation.relationType))
            .filter(relation => this.isLearnedVaultRelationStructurallyPlausible(relation.evidence, relation.candidate, relation.relationType))
            .filter(relation => this.hasLearnedRelationEvidence(relation.evidence, evidenceText))
            .map(relation => ({
                ...relation,
                confidence: this.getLearnedVaultRelationConfidence(relation.relationType, model, relation.confidence, 1),
            }))
            .filter(relation => relation.confidence >= this.settings.learnedVaultRelationMinimumConfidence);
        const rejectedCount = this.settings.rejectedVaultRelations.length;
        this.settings.rejectedVaultRelations = this.settings.rejectedVaultRelations.filter(relation =>
            !accepted.has(relation.candidate.toLowerCase())
            || !this.hasLearnedRelationEvidence(relation.evidence, evidenceText)
        );
        let changed = this.settings.rejectedVaultRelations.length !== rejectedCount;
        if (proposed.length === 0) {
            if (changed) this.rebuildVaultRelationshipIndexes();
            return changed;
        }

        const now = Date.now();
        const relationsByPair = new Map(this.learnedVaultRelationsByPair);
        proposed.forEach(relation => {
            const pairKey = this.getVaultRelationshipPairKey(relation.evidence, relation.candidate);
            const existing = relationsByPair.get(pairKey);
            if (existing) {
                existing.relationType = relation.relationType;
                existing.model = model;
                existing.confirmations += 1;
                existing.confidence = Math.min(100, Math.max(
                    existing.confidence,
                    relation.confidence,
                    this.getLearnedVaultRelationConfidence(relation.relationType, model, relation.confidence, existing.confirmations)
                ) + 2);
                existing.lastConfirmedAt = now;
                existing.lastUsedAt = now;
                changed = true;
                return;
            }
            const createdRelation: LearnedVaultRelation = {
                ...relation,
                model,
                pinned: false,
                confirmations: 1,
                createdAt: now,
                lastConfirmedAt: now,
                lastUsedAt: now,
            };
            this.settings.learnedVaultRelations.push(createdRelation);
            relationsByPair.set(pairKey, createdRelation);
            changed = true;
        });
        this.pruneLearnedVaultRelations();
        return changed;
    }

    rememberRejectedVaultRelationships(
        candidateMatches: VaultCandidateMatch[],
        acceptedTerms: string[],
        model: string
    ): boolean {
        const accepted = new Set(acceptedTerms.map(term => term.toLowerCase()));
        const now = Date.now();
        let changed = false;
        const rejectedByPair = new Map(this.rejectedVaultRelationsByPair);
        candidateMatches.forEach(match => {
            if (match.tier === "exact" || match.tier === "aliases" || match.tier === "learned") return;
            if (accepted.has(match.candidate.toLowerCase())) return;
            const pairKey = this.getVaultRelationshipPairKey(match.evidence, match.candidate);
            const existing = rejectedByPair.get(pairKey);
            if (existing) {
                existing.lastSeenAt = now;
                existing.rejectedAt = now;
                existing.model = model;
            } else {
                const rejectedRelation: RejectedVaultRelation = {
                    evidence: match.evidence,
                    candidate: match.candidate,
                    model,
                    rejectedAt: now,
                    lastSeenAt: now,
                };
                this.settings.rejectedVaultRelations.push(rejectedRelation);
                rejectedByPair.set(pairKey, rejectedRelation);
            }
            changed = true;
        });
        if (!changed) return false;
        this.settings.rejectedVaultRelations = this.settings.rejectedVaultRelations
            .filter(relation => relation.rejectedAt >= now - REJECTED_VAULT_RELATION_TTL_MS)
            .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
            .slice(0, this.settings.learnedVaultRelationCacheLimit * 2);
        this.rebuildVaultRelationshipIndexes();
        return true;
    }

    buildLearnedVaultRelationsNoteContent(): string {
        const relations = [...this.settings.learnedVaultRelations]
            .sort((a, b) => a.createdAt - b.createdAt);
        const rejected = [...this.settings.rejectedVaultRelations]
            .sort((a, b) => a.rejectedAt - b.rejectedAt);
        const clean = (value: string) => value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
        return [
            "# Learned Vault Awareness Relationships",
            "",
            "Generated by Autotag inside the plugin folder. Changes made here are not imported and may be overwritten.",
            "Exact vocabulary matches and configured aliases are accepted directly and are intentionally not stored as learned relationships.",
            "",
            `Accepted cache: ${relations.length} / ${this.settings.learnedVaultRelationCacheLimit}`,
            `Minimum retained confidence: ${this.settings.learnedVaultRelationMinimumConfidence}`,
            "",
            ...(relations.length > 0
                ? relations.map(relation => [
                    `- ${clean(relation.evidence)} -> ${clean(relation.candidate)}`,
                    clean(relation.relationType),
                    `${relation.confidence}% confidence`,
                    relation.pinned ? "kept manually" : "automatic",
                    this.isLearnedVaultRelationReusable(relation) ? "ready" : "awaiting confirmation",
                    `${relation.confirmations} confirmation${relation.confirmations === 1 ? "" : "s"}`,
                    clean(relation.model || "unknown model"),
                ].join(" | "))
                : ["No learned relationships yet."]),
            "",
            `Temporary rejected cache: ${rejected.length}`,
            "",
            ...(rejected.length > 0
                ? rejected.map(relation => [
                    `- ${clean(relation.evidence)} -/-> ${clean(relation.candidate)}`,
                    clean(relation.model || "unknown model"),
                    `expires ${new Date(relation.rejectedAt + REJECTED_VAULT_RELATION_TTL_MS).toISOString()}`,
                ].join(" | "))
                : ["No temporarily rejected relationships."]),
            "",
        ].join("\n");
    }

    getLearnedVaultRelationsFilePath(): string {
        return `${this.getPluginFolderPath()}/${LEARNED_VAULT_RELATIONS_FILE_NAME}`;
    }

    async syncLearnedVaultRelationsNote(createWhenEmpty = false): Promise<string | null> {
        const path = this.getLearnedVaultRelationsFilePath();
        const exists = await this.app.vault.adapter.exists(path);
        if (this.settings.learnedVaultRelations.length === 0
            && this.settings.rejectedVaultRelations.length === 0
            && !createWhenEmpty
            && !exists) {
            return null;
        }
        const content = this.buildLearnedVaultRelationsNoteContent();
        if (!exists || await this.app.vault.adapter.read(path) !== content) {
            await this.app.vault.adapter.write(path, content);
        }

        const legacy = this.app.vault.getAbstractFileByPath(LEARNED_VAULT_RELATIONS_FILE_NAME);
        if (legacy instanceof TFile) {
            await this.app.vault.trash(legacy, true);
        }
        return path;
    }

    async showLearnedVaultRelationsFile(): Promise<void> {
        const path = await this.syncLearnedVaultRelationsNote(true);
        if (!path?.trim()) {
            new Notice("Could not resolve the learned relationships file path.");
            return;
        }
        const fullPath = this.getFullVaultPath(path);
        if (!fullPath?.trim()) {
            new Notice(`Relationships file: ${path}`);
            return;
        }
        try {
            const fs = require("fs/promises") as typeof import("fs/promises");
            const stats = await fs.stat(fullPath);
            if (!stats.isFile()) throw new Error("The relationships path is not a file.");
            const electron = require("electron") as any;
            if (typeof electron.shell?.showItemInFolder !== "function") {
                throw new Error("The system file browser is unavailable.");
            }
            electron.shell.showItemInFolder(fullPath);
        } catch (error) {
            console.warn("Autotag could not reveal the learned relationships file", fullPath, error);
            try {
                await navigator.clipboard.writeText(fullPath);
                new Notice("Could not show the relationships file. Its full path was copied to the clipboard.");
            } catch (clipboardError) {
                console.warn("Autotag could not copy the learned relationships file path", clipboardError);
                new Notice(`Could not show the relationships file. Path: ${fullPath}`);
            }
        }
    }

    getLearnedVaultRelation(evidence: string, candidate: string): LearnedVaultRelation | undefined {
        return this.learnedVaultRelationsByPair.get(this.getVaultRelationshipPairKey(evidence, candidate));
    }

    async keepLearnedVaultRelation(evidence: string, candidate: string): Promise<boolean> {
        const relation = this.getLearnedVaultRelation(evidence, candidate);
        if (!relation) return false;
        relation.pinned = true;
        relation.confidence = 100;
        relation.confirmations = Math.max(2, relation.confirmations);
        relation.lastConfirmedAt = Date.now();
        await this.persistVaultRelationshipChanges();
        return true;
    }

    async removeLearnedVaultRelation(evidence: string, candidate: string): Promise<boolean> {
        const before = this.settings.learnedVaultRelations.length;
        this.settings.learnedVaultRelations = this.settings.learnedVaultRelations.filter(relation =>
            relation.evidence.toLowerCase() !== evidence.toLowerCase()
            || relation.candidate.toLowerCase() !== candidate.toLowerCase()
        );
        if (this.settings.learnedVaultRelations.length === before) return false;
        await this.persistVaultRelationshipChanges();
        return true;
    }

    async rejectLearnedVaultRelation(evidence: string, candidate: string): Promise<boolean> {
        const before = this.settings.learnedVaultRelations.length;
        this.settings.learnedVaultRelations = this.settings.learnedVaultRelations.filter(relation =>
            relation.evidence.toLowerCase() !== evidence.toLowerCase()
            || relation.candidate.toLowerCase() !== candidate.toLowerCase()
        );
        if (this.settings.learnedVaultRelations.length === before) return false;
        const now = Date.now();
        const existing = this.rejectedVaultRelationsByPair.get(
            this.getVaultRelationshipPairKey(evidence, candidate)
        );
        if (existing) {
            existing.model = "Manual review";
            existing.rejectedAt = now;
            existing.lastSeenAt = now;
        } else {
            this.settings.rejectedVaultRelations.push({
                evidence,
                candidate,
                model: "Manual review",
                rejectedAt: now,
                lastSeenAt: now,
            });
        }
        this.settings.rejectedVaultRelations = this.settings.rejectedVaultRelations
            .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
            .slice(0, this.settings.learnedVaultRelationCacheLimit * 2);
        await this.persistVaultRelationshipChanges();
        return true;
    }

    async editLearnedVaultRelation(
        originalEvidence: string,
        originalCandidate: string,
        updates: { evidence: string; candidate: string; relationType: string; confidence: number }
    ): Promise<boolean> {
        const relation = this.getLearnedVaultRelation(originalEvidence, originalCandidate);
        if (!relation) return false;
        const evidence = this.normalizeAiTagName(updates.evidence).slice(0, 160);
        const candidate = this.normalizeAiTagName(updates.candidate).slice(0, 160);
        if (!evidence || !candidate || evidence.toLowerCase() === candidate.toLowerCase()) return false;
        const relationType = updates.relationType.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40) || "related";
        relation.evidence = evidence;
        relation.candidate = candidate;
        relation.relationType = relationType;
        relation.confidence = this.clampSetting(updates.confidence, relation.confidence, 0, 100);
        relation.model = "Manual review";
        relation.lastConfirmedAt = Date.now();
        this.pruneLearnedVaultRelations();
        await this.persistVaultRelationshipChanges();
        return this.getLearnedVaultRelation(evidence, candidate) !== undefined;
    }

    isLearnedVaultRelationTypeEnabled(relationType: string): boolean {
        if (!this.settings.selfLearningBridgeEnabled) return false;
        const normalized = relationType.toLowerCase();
        if (normalized === "word-family") return this.settings.vaultMatchingTiers.structural && this.settings.vaultLinguisticFeatures.grammaticalVariants !== "exclude";
        if (normalized === "synonym") return this.settings.vaultMatchingTiers.semantic && this.settings.vaultLinguisticFeatures.synonyms !== "exclude";
        if (normalized === "compound") return this.settings.vaultMatchingTiers.structural && this.settings.vaultLinguisticFeatures.compoundDecomposition !== "exclude";
        if (normalized === "spelling") return this.settings.vaultMatchingTiers.structural && this.settings.vaultLinguisticFeatures.spellingVariants !== "exclude";
        if (normalized === "acronym") return this.settings.vaultMatchingTiers.structural && this.settings.vaultLinguisticFeatures.acronymsAbbreviations !== "exclude";
        if (normalized === "broader-narrower") return this.settings.vaultMatchingTiers.semantic && this.settings.vaultLinguisticFeatures.broaderNarrower === "use";
        return false;
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

    getCombinedBridgeRuleText(): string {
        return typeof this.settings.bridgeRules === "string" ? this.settings.bridgeRules : "";
    }

    parseManualEnrichmentRules(): Map<string, string[]> {
        const rules = new Map<string, string[]>();

        this.getCombinedBridgeRuleText()
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("#"))
            .forEach(line => {
                const separator = line.includes("=>") ? "=>" : line.includes(":") ? ":" : "";
                if (!separator) return;

                const [sourceText, targets] = line.split(separator);
                if (!targets) return;

                const targetNames = targets
                    .split(",")
                    .map(target => this.normalizeAiTagName(target))
                    .filter(Boolean);

                if (targetNames.length === 0) return;

                sourceText
                    .split(",")
                    .map(source => this.normalizeAiTagName(source))
                    .filter(Boolean)
                    .forEach(sourceName => {
                        const key = sourceName.toLowerCase();
                        rules.set(key, this.normalizeUniqueAiTags([...(rules.get(key) ?? []), ...targetNames]));
                    });
            });

        return rules;
    }


    parseManualSubjectBridgeRules(): { sources: string[]; targets: string[] }[] {
        return this.getCombinedBridgeRuleText()
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


    isValidCandidateMode(value: unknown): value is CandidateMode {
        return value === "disabled" || value === "consider" || value === "all" || value === "exclude";
    }

    normalizeCandidateMode(value: unknown, fallback: CandidateMode = "disabled"): CandidateMode {
        return this.isValidCandidateMode(value) ? value : fallback;
    }

    isCandidateSourceActive(mode: CandidateMode): boolean {
        return mode === "consider" || mode === "all";
    }

    isCandidateSourceConfigured(mode: CandidateMode): boolean {
        return mode !== "disabled";
    }

    getFolderMappingAiCandidateMode(mapping: FolderPropertyMapping): CandidateMode {
        return this.normalizeCandidateMode(
            mapping.aiCandidateMode,
            mapping.useAsAiCandidate === false ? "disabled" : "all"
        );
    }

    getFolderFallbackAiCandidateMode(): CandidateMode {
        return this.normalizeCandidateMode(
            this.settings.folderFallbackAiCandidateMode,
            this.settings.folderFallbackUseAsAiCandidate === false ? "disabled" : DEFAULT_SETTINGS.folderFallbackAiCandidateMode
        );
    }

    hasConfiguredFolderAiCandidateSource(): boolean {
        if (!this.settings.useFolderTags) return false;
        return this.getFolderPropertyMappings().some(mapping => this.isCandidateSourceConfigured(this.getFolderMappingAiCandidateMode(mapping)))
            || this.isCandidateSourceConfigured(this.getFolderFallbackAiCandidateMode());
    }

    hasActiveFolderAiCandidateSource(): boolean {
        if (!this.settings.useFolderTags) return false;
        return this.getFolderPropertyMappings().some(mapping => this.isCandidateSourceActive(this.getFolderMappingAiCandidateMode(mapping)))
            || this.isCandidateSourceActive(this.getFolderFallbackAiCandidateMode());
    }

    isBridgeAiInputUsable(): boolean {
        return this.settings.bridgeUseAiInput && this.settings.aiTaggingEnabled;
    }

    isBridgeFilenameInputUsable(): boolean {
        return this.settings.bridgeUseFilenameInput && this.isCandidateSourceActive(this.settings.filenameCandidateMode);
    }

    isBridgeFolderInputUsable(): boolean {
        return this.settings.bridgeUseFolderInput && this.hasActiveFolderAiCandidateSource();
    }

    isBridgeGeolocationInputUsable(): boolean {
        return this.settings.bridgeUseGeolocationInput && this.settings.geolocationEnabled;
    }

    hasUsableBridgeInput(): boolean {
        return this.isBridgeAiInputUsable()
            || this.isBridgeFilenameInputUsable()
            || this.isBridgeFolderInputUsable()
            || this.isBridgeGeolocationInputUsable();
    }

    canRunDirectBridgeOutput(): boolean {
        return this.settings.manualEnrichmentEnabled
            && this.hasUsableBridgeInput()
            && this.getCombinedBridgeRuleText().trim().length > 0;
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

    getFolderCandidatePromptMode(
        folderStrongCandidates: string[],
        folderConsiderCandidates: string[],
        folderExcludedCandidates: string[]
    ): CandidateMode {
        if (folderStrongCandidates.length > 0) return "all";
        if (folderConsiderCandidates.length > 0) return "consider";
        if (folderExcludedCandidates.length > 0) return "exclude";
        return "disabled";
    }

    formatFolderCandidatePromptHint(
        folderStrongCandidates: string[],
        folderConsiderCandidates: string[],
        folderExcludedCandidates: string[]
    ): string {
        const parts: string[] = [];
        if (folderStrongCandidates.length > 0) parts.push(`all: ${folderStrongCandidates.join(", ")}`);
        if (folderConsiderCandidates.length > 0) parts.push(`consider: ${folderConsiderCandidates.join(", ")}`);
        if (folderExcludedCandidates.length > 0) parts.push(`excluded: ${folderExcludedCandidates.join(", ")}`);
        return parts.length > 0 ? parts.join("; ") : "none";
    }

    getFilenameNoiseWords(): Set<string> {
        return new Set([
            "ata", "copy", "dcim", "dsc", "dscf", "dscn", "edited", "file", "heic", "heif",
            "image", "img", "jpeg", "jpg", "mov", "mp4", "mv", "photo", "pict", "png",
            "pxl", "scan", "screen", "screenrecord", "screenrecording", "screenshot",
            "snapchat", "telegram", "untitled", "vid", "video", "wa", "webp",
        ]);
    }

    isFilenameNoiseWord(word: string): boolean {
        const key = word.toLowerCase();
        if (/^\d+$/.test(key)) return true;
        if (this.getFilenameNoiseWords().has(key)) return true;
        if (/^[a-f0-9]{8,}$/i.test(key) && /\d/.test(key)) return true;
        if (/^[a-z]{1,5}\d{3,}$/i.test(key)) return true;
        return false;
    }

    getFilenameWords(rawBasename: string, splitAlphaNumeric = false): string[] {
        const source = splitAlphaNumeric
            ? rawBasename
                .replace(/(\p{L})(\p{N}+)/gu, "$1 ")
                .replace(/(\p{N}+)(\p{L})/gu, " $2")
            : rawBasename;
        const basename = source
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .trim();
        if (!basename) return [];
        return basename.split(/\s+/).map(word => word.trim()).filter(Boolean);
    }

    getHumanReadableFilenameWords(rawBasename: string, words: string[]): string[] {
        const compactName = rawBasename.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
        if (/^[a-f0-9]{12,}$/i.test(compactName) && /\d/.test(compactName)) {
            return [];
        }

        return words.filter(word => !this.isFilenameNoiseWord(word));
    }

    getFilenameAiTagExclusionTerms(file: TFile | null): Set<string> {
        const terms = new Set<string>();
        if (!this.settings.filenameCandidatesHumanReadableOnly || !file) return terms;

        this.getFilenameWords(file.basename, true)
            .map(word => this.normalizeAiTagName(word))
            .filter(word => word && this.isFilenameNoiseWord(word))
            .forEach(word => terms.add(word.toLowerCase()));

        return terms;
    }

    filterFilenameNoiseFromAiTags(tags: string[], file: TFile | null): string[] {
        const excludedTerms = this.getFilenameAiTagExclusionTerms(file);
        if (excludedTerms.size === 0) return tags;
        return tags.filter(tag => !excludedTerms.has(this.normalizeAiTagName(tag).toLowerCase()));
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
        const humanReadableOnly = this.settings.filenameCandidatesHumanReadableOnly;
        let words = this.getFilenameWords(file.basename, humanReadableOnly)
            .map(word => word.trim())
            .filter(word => !humanReadableOnly || word.length >= 2)
            .filter(word => !humanReadableOnly || !/^\d+$/.test(word))
            .filter(word => !humanReadableOnly || !stopWords.has(word.toLowerCase()))
            .map(word => this.normalizeAiTagName(word))
            .filter(word => word && !excludedTerms.has(word.toLowerCase()));
        if (humanReadableOnly) {
            words = this.getHumanReadableFilenameWords(file.basename, words);
            if (words.length === 0) return [];
        }

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
        if (!humanReadableOnly && words.length > 2) {
            add(words.join(" "));
        }
        for (let index = 0; index < words.length - 1; index++) {
            add(`${words[index]} ${words[index + 1]}`);
        }

        return candidates.slice(0, 24);
    }

    selectBalancedVaultVocabularyCandidates(
        candidates: RankedVaultVocabularyCandidate[],
        limit: number
    ): string[] {
        const sorted = [...candidates].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
        if (sorted.length <= limit) return sorted.map(candidate => candidate.name);

        const channelOrder: VaultEvidenceChannel[] = [
            "folder",
            "filename",
            "geolocation",
            "aiTags",
            "description",
            "semantic",
            "structural",
            "learned",
            "manual",
        ];
        const activeChannels = channelOrder.filter(channel =>
            sorted.some(candidate => candidate.sourceScores[channel] > 0)
        );
        const channelBuckets = new Map<VaultEvidenceChannel, RankedVaultVocabularyCandidate[]>();
        const channelOffsets = new Map<VaultEvidenceChannel, number>();
        activeChannels.forEach(channel => {
            channelBuckets.set(channel, [...sorted]
                .filter(candidate => candidate.sourceScores[channel] > 0)
                .sort((a, b) => b.sourceScores[channel] - a.sourceScores[channel] || b.score - a.score));
            channelOffsets.set(channel, 0);
        });
        const selected = new Map<string, RankedVaultVocabularyCandidate>();
        const balancedBudget = Math.min(limit, Math.max(activeChannels.length, Math.floor(limit * 0.6)));
        let madeProgress = true;
        while (selected.size < balancedBudget && madeProgress) {
            madeProgress = false;
            for (const channel of activeChannels) {
                if (selected.size >= balancedBudget) break;
                const bucket = channelBuckets.get(channel) ?? [];
                let offset = channelOffsets.get(channel) ?? 0;
                while (offset < bucket.length && selected.has(bucket[offset].name.toLowerCase())) offset += 1;
                channelOffsets.set(channel, offset + 1);
                const next = bucket[offset];
                if (!next) continue;
                selected.set(next.name.toLowerCase(), next);
                madeProgress = true;
            }
        }
        sorted.forEach(candidate => {
            if (selected.size >= limit) return;
            selected.set(candidate.name.toLowerCase(), candidate);
        });
        return Array.from(selected.values())
            .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
            .map(candidate => candidate.name);
    }

    getRankedVaultVocabularyTerms(
        folderTagCandidates: string[] = [],
        filenameCandidates: string[] = [],
        geolocationContextText: string = "",
        baseTags: string[] = [],
        aiDescription: string = "",
        semanticHints: string[] = [],
        folderExcludedCandidates: string[] = [],
        folderStrongCandidates: string[] = folderTagCandidates
    ): string[] {
        const excluded = new Set<string>();
        folderExcludedCandidates.forEach(value => excluded.add(value.toLowerCase()));
        if (this.settings.filenameCandidateMode === "exclude") {
            filenameCandidates.forEach(value => excluded.add(value.toLowerCase()));
        }
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const folderText = folderStrongCandidates.join(" ");
        const folderCandidateText = folderTagCandidates.join(" ");
        const filenameText = filenameCandidates.join(" ");
        const geolocationText = geolocationContextText.trim();
        const aiTagText = baseTags.join(" ");
        const semanticHintText = semanticHints.join(" ");
        const structuralEvidencePhrases = [
            ...folderTagCandidates,
            ...filenameCandidates,
            geolocationText,
            ...baseTags,
            ...semanticHints,
        ].filter(Boolean);
        const manualRules = this.settings.manualEnrichmentEnabled && this.hasUsableBridgeInput()
            ? this.parseManualEnrichmentRules()
            : new Map<string, string[]>();
        const manualTargets = new Set<string>();
        manualRules.forEach(targets => targets.forEach(target => manualTargets.add(target.toLowerCase())));

        const rankedCandidates = Array.from(this.vaultVocabulary.values())
            .filter(entry => !excluded.has(entry.name.toLowerCase()))
            .map(entry => {
                const ageMs = Math.max(0, now - entry.lastSeen);
                const recencyBonus = Math.max(0, 5 - (ageMs / thirtyDaysMs) * 5);
                const names = this.settings.vaultMatchingTiers.aliases && this.settings.vaultLinguisticFeatures.vaultAliases === "use"
                    ? [entry.name, ...entry.aliases]
                    : [entry.name];
                const bestMatch = (text: string) => Math.max(...names.map(name =>
                    this.getTextMatchScore(
                        name,
                        text,
                        this.settings.vaultMatchingTiers.structural && this.settings.vaultLinguisticFeatures.grammaticalVariants === "use",
                        this.settings.vaultMatchingTiers.structural && this.settings.vaultLinguisticFeatures.compoundDecomposition === "use"
                    )
                ));
                const folderBonus = folderStrongCandidates.length > 0
                    ? bestMatch(folderText) * 50
                    : bestMatch(folderCandidateText) * 40;
                const filenameBonus = this.settings.filenameCandidateMode === "all" ? bestMatch(filenameText) * 35 : 0;
                const geolocationBonus = geolocationText ? bestMatch(geolocationText) * 25 : 0;
                const aiTagBonus = bestMatch(aiTagText) * 15;
                const semanticHintBonus = this.settings.selfLearningBridgeEnabled && this.settings.vaultMatchingTiers.semantic ? bestMatch(semanticHintText) * 12 : 0;
                const structuralBonus = this.settings.selfLearningBridgeEnabled && this.settings.vaultMatchingTiers.structural
                    && this.getStructuralVaultEvidence(entry.name, structuralEvidencePhrases)
                    ? 70
                    : 0;
                const descriptionBonus = bestMatch(aiDescription) * 4;
                const manualBonus = manualTargets.has(entry.name.toLowerCase()) ? 30 : 0;
                const learnedBonus = (this.learnedVaultRelationsByCandidate.get(entry.name.toLowerCase()) ?? []).some(relation =>
                    this.settings.selfLearningBridgeEnabled
                    && this.settings.vaultMatchingTiers.learned
                    && this.isLearnedVaultRelationReusable(relation)
                    && this.hasLearnedRelationEvidence(relation.evidence, `${folderCandidateText} ${filenameText} ${geolocationText} ${aiTagText} ${aiDescription}`)
                ) ? 80 : 0;
                const sourceScores: Record<VaultEvidenceChannel, number> = {
                    folder: folderBonus,
                    filename: filenameBonus,
                    geolocation: geolocationBonus,
                    aiTags: aiTagBonus,
                    description: descriptionBonus,
                    semantic: semanticHintBonus,
                    structural: structuralBonus,
                    learned: learnedBonus,
                    manual: manualBonus,
                };
                const evidenceScore = Object.values(sourceScores).reduce((total, value) => total + value, 0);

                return {
                    name: entry.name,
                    score: evidenceScore + Math.min(entry.frequency, 5) + (recencyBonus * 0.25),
                    sourceScores,
                };
            })
            .filter(entry => Object.values(entry.sourceScores).some(score => score > 0));
        return this.selectBalancedVaultVocabularyCandidates(
            rankedCandidates,
            this.settings.maxPromptVocabularyTerms
        );
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

    filterUnsupportedCandidateEchoTags(
        tags: string[],
        aiDescription: string,
        folderTagCandidates: string[],
        geolocationContextText: string = ""
    ): string[] {
        const descriptionText = aiDescription.trim();
        if (!descriptionText) return tags;

        const folderCandidateKeys = new Set(
            folderTagCandidates
                .map(candidate => this.normalizeAiTagName(candidate).toLowerCase())
                .filter(Boolean)
        );
        if (folderCandidateKeys.size === 0) return tags;

        const directEvidenceText = [descriptionText, geolocationContextText].filter(Boolean).join(" ");
        return tags.filter(tag => {
            const normalized = this.normalizeAiTagName(tag);
            if (!folderCandidateKeys.has(normalized.toLowerCase())) return true;
            return this.isConceptSupportedLocally(normalized, directEvidenceText, this.settings.vaultLinguisticFeatures);
        });
    }

    getFolderAiTagExclusionTerms(folderGeneratedValues: string[]): Set<string> {
        const terms = new Set<string>();
        if (!this.settings.removeFolderTagsFromAiTags) return terms;

        folderGeneratedValues.forEach(value => {
            const normalized = this.normalizeAiTagName(value);
            if (normalized) terms.add(normalized.toLowerCase());
        });

        return terms;
    }

    filterFolderTermsFromAiTags(tags: string[], folderGeneratedValues: string[]): string[] {
        const excludedTerms = this.getFolderAiTagExclusionTerms(folderGeneratedValues);
        if (excludedTerms.size === 0) return tags;
        return tags.filter(tag => !excludedTerms.has(this.normalizeAiTagName(tag).toLowerCase()));
    }

    getGeolocationAiTagExclusionTerms(context: ImageGeolocationContext | null): Set<string> {
        const terms = new Set<string>();
        if (!this.settings.removeGeolocationFromAiTags || !context) return terms;

        const add = (value: unknown) => {
            if (typeof value !== "string") return;
            const normalized = this.normalizeAiTagName(value);
            if (normalized) terms.add(normalized.toLowerCase());
        };
        const addCoordinate = (value: unknown) => {
            if (value === undefined || value === null || value === "") return;
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) {
                add(String(value));
                return;
            }
            add(String(value));
            for (let decimals = 0; decimals <= 6; decimals += 1) {
                add(numeric.toFixed(decimals).replace(/\.?0+$/, ""));
            }
        };

        [
            "gps",
            "gps coordinates",
            "coordinates",
            "coordinate",
            "latitude",
            "longitude",
            "altitude",
            "geo",
            "geolocation",
            "location metadata",
        ].forEach(add);
        addCoordinate(context.coordinates.latitude);
        addCoordinate(context.coordinates.longitude);
        addCoordinate(context.coordinates.altitude);

        ([
            "latitude",
            "longitude",
            "altitude",
            "country",
            "region",
            "county",
            "city",
            "suburb",
            "road",
            "postcode",
            "houseNumber",
            "address",
            "displayName",
        ] as GeolocationField[]).forEach(field => {
            const value = context.locationData[field];
            add(value);
            addCoordinate(value);
            if (field === "address" || field === "displayName") {
                value
                    ?.split(/[,;|/]+/)
                    .map(part => part.trim())
                    .forEach(part => {
                        add(part);
                        add(part.replace(/\b\d+(?:[.,]\d+)?\b/g, "").replace(/\s+/g, " ").trim());
                    });
            }
        });

        return terms;
    }

    filterGeolocationTermsFromAiTags(tags: string[], context: ImageGeolocationContext | null): string[] {
        const excludedTerms = this.getGeolocationAiTagExclusionTerms(context);
        if (excludedTerms.size === 0) return tags;
        const normalizeLoose = (value: string) => this.normalizeAiTagName(value)
            .toLowerCase()
            .replace(/[^\p{L}\p{N}.,+-]+/gu, " ")
            .replace(/\s+/g, " ")
            .trim();
        const geolocationText = context
            ? ` ${normalizeLoose(this.formatGeolocationContextForDescription(context))} `
            : "";
        const excludedLooseTerms = Array.from(excludedTerms)
            .map(term => normalizeLoose(term))
            .filter(term => term.length >= 3);
        const containsWholeLooseTerm = (haystack: string, needle: string) => {
            const escaped = this.escapeRegex(needle).replace(/\s+/g, "\\s+");
            return new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i").test(haystack);
        };
        return tags.filter(tag => {
            const normalizedTag = this.normalizeAiTagName(tag).toLowerCase();
            if (excludedTerms.has(normalizedTag)) return false;
            const looseTag = normalizeLoose(tag);
            if (/^[+-]?\d{1,3}(?:[.,]\d{2,})?$/.test(looseTag)) return false;
            if (looseTag.length >= 3 && geolocationText.includes(` ${looseTag} `)) return false;
            return !excludedLooseTerms.some(term => containsWholeLooseTerm(looseTag, term));
        });
    }

    expandAiTagsWithKnownVocabulary(
        aiTags: string[],
        filenameCandidates: string[] = [],
        folderTagCandidates: string[] = [],
        folderExcludedCandidates: string[] = [],
        geolocationContextText: string = ""
    ): string[] {
        const excluded = new Set<string>();
        folderExcludedCandidates.forEach(value => excluded.add(value.toLowerCase()));
        if (this.settings.filenameCandidateMode === "exclude") {
            filenameCandidates.forEach(value => excluded.add(value.toLowerCase()));
        }
        const seen = new Set<string>();
        const expanded: string[] = [];
        const add = (value: string) => {
            const normalized = this.normalizeAiTagName(value);
            const key = normalized.toLowerCase();
            if (!normalized || seen.has(key) || excluded.has(key)) return;
            seen.add(key);
            expanded.push(normalized);
        };

        const expansionSources = [...aiTags];
        const directExpansionEvidenceText = [
            this.isBridgeAiInputUsable() ? aiTags.join(" ") : "",
            this.isBridgeFilenameInputUsable() ? filenameCandidates.join(" ") : "",
            this.isBridgeFolderInputUsable() ? folderTagCandidates.join(" ") : "",
            this.isBridgeGeolocationInputUsable() ? geolocationContextText : "",
        ].filter(Boolean).join(" ");
        if (this.settings.manualEnrichmentEnabled && directExpansionEvidenceText.trim()) {
            this.parseManualSubjectBridgeRules().forEach(rule => {
                const matchedSources = rule.sources.filter(source =>
                    this.isConceptSupportedLocally(source, directExpansionEvidenceText, this.settings.bridgeLinguisticFeatures)
                );
                if (matchedSources.length === 0) return;
                [...matchedSources, ...rule.targets].forEach(term => add(term));
            });
        }

        expansionSources.forEach(domain => {
            add(domain);

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
        folderMode: CandidateMode,
        geolocationContextText: string = ""
    ): { role: string; content: string }[] {
        const hasGeolocationContext = geolocationContextText.trim().length > 0;
        const geolocationAllowedForAiTags = hasGeolocationContext && !this.settings.removeGeolocationFromAiTags;
        const humanReadableFilenameGuard = this.settings.filenameCandidatesHumanReadableOnly;
        const hasExcludedFolderCandidates = folderTagCandidateHint.includes("excluded:");
        const filenameInstruction = filenameMode === "all"
            ? humanReadableFilenameGuard
                ? "Filename keywords are an additional metadata source, but they are not mandatory output. Use them only when they genuinely describe the image or note subject; ignore camera codes, counters, and technical fragments."
                : "Filename keywords are an allowed metadata source. Human-readable filename cleanup is disabled, so consider provided filename words, codes, counters, timestamps, and technical fragments as-is when they may be useful to the user. Do not reject them only because they are not natural language."
            : filenameMode === "consider"
                ? humanReadableFilenameGuard
                    ? "Filename keywords are cleaned human-readable clues only; use them only when supported by the image description."
                    : "Filename keywords are clues only. Human-readable filename cleanup is disabled, so assess provided filename fragments exactly as shown, including technical fragments, but still use them only when supported by the image description."
                : filenameMode === "exclude"
                    ? "Do not use filename keywords as a source, and do not repeat exact filename keywords in aitags."
                    : "Ignore filename keywords.";
        const folderInstruction = [
            folderMode === "all"
                ? "Folder tag keywords marked All Keywords are additional classification/context metadata, but they are not mandatory output. Use them only when they genuinely describe the image or note subject; do not copy every folder name into aitags."
                : folderMode === "consider"
                    ? "Folder tag keywords marked Consider are clues only; use them only when supported by the image description or filename keywords."
                    : folderMode === "exclude"
                        ? "Do not use folder tag keywords as a source, and do not repeat exact current folder-derived keywords in aitags."
                        : "Ignore folder tag keywords.",
            hasExcludedFolderCandidates ? "Folder tag keywords marked Excluded must not be returned as aitags, even if other folder keywords are allowed." : "",
        ].filter(Boolean).join(" ");
        const filenameGuardDisabledInstruction = !humanReadableFilenameGuard && (filenameMode === "all" || filenameMode === "consider")
            ? "Do not apply any additional human-readable filtering to filename candidates in this pass."
            : "";
        const includeVaultLookupHints = this.settings.vaultAwarenessEnabled
            && this.settings.selfLearningBridgeEnabled
            && this.settings.vaultMatchingTiers.semantic;
        const responseShape = includeVaultLookupHints
            ? '{"aitags":["term"],"vaultHints":["close wording or concept"]}'
            : '{"aitags":["term"]}';
        return [
            {
                role: "system",
                content: [
                    "You create semantic search metadata for Obsidian image notes.",
                    `Respond with JSON only in this exact shape: ${responseShape}.`,
                    this.getOllamaGeneratedTagsCap() === 0 ? "Use as many useful concise terms as are genuinely supported." : `Use concise terms and return at most ${this.getOllamaGeneratedTagsCap()} aitags.`,
                    "Prefer nouns and concepts visible or strongly implied by the description.",
                    "Add useful synonyms when they improve searchability, such as fortress for castle.",
                    "Do not use vault vocabulary yet; this pass creates base tags only.",
                    filenameInstruction,
                    folderInstruction,
                    geolocationAllowedForAiTags
                        ? "Known geolocation metadata is a trusted metadata source for location-specific tags. Use it to avoid guessed city, country, landmark, or region claims, and do not invent place names that are not present in that metadata."
                        : hasGeolocationContext
                            ? "Known geolocation metadata is available only to prevent location guesses. Do not return city, country, region, landmark, road, address, GPS, coordinate, latitude, or longitude terms in aitags."
                        : "Do not guess city, country, landmark, or region tags from visual style, architecture, filename, or folder names unless directly supported by the description or an allowed metadata source.",
                    filenameGuardDisabledInstruction,
                    includeVaultLookupHints
                        ? "vaultHints are retrieval hints only and are never written directly. Return at most 20 concise alternative wordings, inflections, direct synonyms, or immediate broader/narrower concepts that could help find equivalent existing vault vocabulary. Do not repeat aitags and do not create chains of related concepts."
                        : "",
                    "Reject candidates that are only common, recent, adjacent, or listed but not supported by the description or an allowed metadata source.",
                    "Do not include markdown, hashtags, explanations, paths, or duplicate terms.",
                ].filter(Boolean).join(" "),
            },
            {
                role: "user",
                content: [
                    "Image description:",
                    aiDescription.trim(),
                    "",
                    `Filename keyword candidates (${filenameMode}): ${filenameCandidateHint}`,
                    `Folder tag keyword candidates (${folderMode}): ${folderTagCandidateHint}`,
                    hasGeolocationContext
                        ? `${geolocationAllowedForAiTags ? "Known geolocation metadata" : "Known geolocation metadata (do not write as aitags)"}: ${geolocationContextText.trim()}`
                        : "",
                    "",
                    filenameMode === "all" || folderMode === "all" || geolocationAllowedForAiTags
                        ? `Return JSON only with terms supported by the image description and/or allowed metadata sources: ${responseShape}`
                        : `Return JSON only with terms supported by the image description: ${responseShape}`,
                ].filter(line => line !== "").join("\n"),
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
        folderTagCandidates: string[],
        geolocationContextText: string = ""
    ): string[] {
        if (!this.settings.bridgeEnabled) return [];
        const evidenceText = [
            this.settings.bridgeUseAiInput ? evidenceDomains.join(" ") : "",
            this.settings.bridgeUseAiInput ? aiDescription : "",
            this.settings.bridgeUseFilenameInput ? filenameCandidates.join(" ") : "",
            this.settings.bridgeUseFolderInput ? folderTagCandidates.join(" ") : "",
            this.settings.bridgeUseGeolocationInput ? geolocationContextText : "",
        ].join(" ");
        const additions = new Map<string, string>();

        this.parseManualSubjectBridgeRules()
            .forEach(rule => {
                const matchedSources = rule.sources.filter(source =>
                    this.isConceptSupportedLocally(source, evidenceText, this.settings.bridgeLinguisticFeatures)
                );
                const matchedTargets = rule.targets.filter(target =>
                    this.isConceptSupportedLocally(target, evidenceText, this.settings.bridgeLinguisticFeatures)
                );
                if (matchedSources.length === 0 && matchedTargets.length === 0) return;

                const supportedTerms = matchedSources.length > 0
                    ? [...matchedSources, ...rule.targets]
                    : matchedTargets;
                supportedTerms.forEach(term => {
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
        geolocationContextText: string,
        endpoint: string,
        model: string
    ): Promise<string[]> {
        if (!this.settings.bridgeEnabled) return [];
        const bridgeBaseTags = this.settings.bridgeUseAiInput ? baseTags : [];
        const bridgeDescription = this.settings.bridgeUseAiInput ? aiDescription : "";
        const bridgeFilenameCandidates = this.settings.bridgeUseFilenameInput ? filenameCandidates : [];
        const bridgeFolderTagCandidates = this.settings.bridgeUseFolderInput ? folderTagCandidates : [];
        const bridgeGeolocationContextText = this.settings.bridgeUseGeolocationInput ? geolocationContextText : "";
        const evidenceText = [
            bridgeBaseTags.join(" "),
            bridgeDescription,
            bridgeFilenameCandidates.join(" "),
            bridgeFolderTagCandidates.join(" "),
            bridgeGeolocationContextText,
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
                        this.settings.bridgeUseAiInput
                            ? "Generated tags and the image description are valid evidence."
                            : "Do not use generated tags or the image description as evidence.",
                        this.settings.bridgeUseFilenameInput
                            ? "Filename keywords are valid evidence."
                            : "Do not use filename keywords as evidence.",
                        this.settings.bridgeUseFolderInput
                            ? "Folder keywords are valid evidence."
                            : "Do not use folder keywords as evidence.",
                        this.settings.bridgeUseGeolocationInput
                            ? "Known geolocation metadata is valid evidence."
                            : "Do not use known geolocation metadata as evidence.",
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
                        `Generated tags: ${bridgeBaseTags.length > 0 ? bridgeBaseTags.join(", ") : "none"}`,
                        "",
                        "Image description:",
                        bridgeDescription.trim() || "none",
                        "",
                        `Filename keywords: ${bridgeFilenameCandidates.length > 0 ? bridgeFilenameCandidates.join(", ") : "none"}`,
                        `Folder keywords: ${bridgeFolderTagCandidates.length > 0 ? bridgeFolderTagCandidates.join(", ") : "none"}`,
                        bridgeGeolocationContextText.trim() ? `Known geolocation metadata: ${bridgeGeolocationContextText.trim()}` : "",
                        "",
                        `The only allowed output values are these configured source concepts: ${sourceHint}`,
                        "",
                        "Judge these source concepts against every evidence section above, not only Generated tags.",
                        'Return represented configured source concepts only: {"aitags":["source1","source2"]}',
                    ].filter(line => line !== "").join("\n"),
                },
            ];
            const requestVariants = this.buildOllamaTagRequestVariants(model, messages);

            for (let attempt = 0; attempt < requestVariants.length; attempt++) {
                try {
                    const response = await this.runOllamaInference(() => requestUrl({
                        url: endpoint,
                        method: "POST",
                        throw: false,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestVariants[attempt]),
                    }));
                    if (response.status < 200 || response.status >= 300) continue;

                    const rawText = this.extractOllamaMessageText(response.json);
                    console.log(`Autotag bridge source matching raw response (attempt ${attempt + 1}):`, rawText);
                    let validSourceCount = 0;
                    this.parseAiTags(rawText).forEach(source => {
                        const key = source.toLowerCase();
                        if (allSources.has(key)) {
                            matchedSources.add(key);
                            validSourceCount++;
                        }
                    });
                    if (validSourceCount > 0 || rawText.trim() === '{"aitags":[]}' || this.isEmptyAiTagJsonResponse(rawText)) break;
                    console.warn("Autotag bridge matcher returned no configured sources; retrying with the next request format.", rawText);
                } catch (e) {
                    console.warn("Autotag bridge source matching attempt threw", {
                        attempt: attempt + 1,
                        model,
                        error: e instanceof Error ? e.message : String(e),
                    });
                }
            }
        }

        console.log("Autotag bridge matching:", {
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
        console.log("Autotag bridge additions:", bridgeAdditions);
        return bridgeAdditions;
    }

    buildOllamaVaultAwarenessMessages(
        baseTags: string[],
        aiDescription: string,
        filenameCandidateHint: string,
        folderTagCandidateHint: string,
        folderMode: CandidateMode,
        vaultVocabularyHint: string,
        geolocationContextText: string = "",
        semanticHints: string[] = []
    ): { role: string; content: string }[] {
        const hasGeolocationContext = geolocationContextText.trim().length > 0;
        const geolocationAllowedForAiTags = hasGeolocationContext && !this.settings.removeGeolocationFromAiTags;
        const hasExcludedFolderCandidates = folderTagCandidateHint.includes("excluded:");
        const folderEvidenceInstruction = folderMode === "all"
            ? "Folder candidates marked All Keywords are controlled classification evidence and may directly support a fitting existing vault value."
            : folderMode === "consider"
                ? "Folder candidates marked Consider are controlled clues, but require support from another evidence source before accepting a vault value."
                : "Folder candidates are not active evidence.";
        const relationshipInstruction = [
            this.settings.vaultMatchingTiers.structural
                ? "Structural verification is enabled for word-family, compound, spelling, and acronym relationships."
                : "Do not accept word-family, compound, spelling, or acronym relationships because structural verification is disabled.",
            this.settings.vaultMatchingTiers.semantic
                ? "Semantic verification is enabled for direct synonyms and immediate broader/narrower concepts."
                : "Do not accept synonyms or broader/narrower concepts because semantic verification is disabled.",
        ].join(" ");
        return [
            {
                role: "system",
                content: [
                    "You select additional Obsidian semantic tags from known vault vocabulary.",
                    'Respond with JSON only in this exact shape: {"vaultSelections":[{"id":"c1","evidence":"exact evidence text","type":"word-family","confidence":85}]}.',
                    `Return at most ${this.settings.maxVaultAwareAdditions} additional known vault concepts that genuinely fit; returning none is correct when none are clearly evidenced.`,
                    "Select only supplied candidate IDs. Never rewrite, translate, or return the candidate wording itself.",
                    "Candidates are shown as ID: vault value <- supporting evidence (matching tier). Return the ID on the left and copy the shortest supporting evidence into that selection.",
                    "Judge evidence in this priority order: controlled folder candidates first, filename candidates second, known geolocation third, generated AI tags fourth, and the image description fifth. Higher-priority evidence should resolve conflicts, but every accepted value must still fit the file.",
                    "Retrieval hints only help find possible wording. They are not evidence and must never be accepted by themselves.",
                    geolocationAllowedForAiTags
                        ? "Select concepts supported by the base domains, image description, active filename keywords, known geolocation metadata, or a manual enrichment rule source."
                        : "Select concepts supported by the base domains, image description, active filename keywords, or a manual enrichment rule source. Do not select location-specific concepts from geolocation metadata.",
                    folderEvidenceInstruction,
                    hasExcludedFolderCandidates ? "Folder tag keywords marked Excluded must not be returned as vault-aware tags." : "",
                    geolocationAllowedForAiTags
                        ? "For location-specific terms, trust the known geolocation metadata and do not infer extra places, regions, countries, or landmarks that are not present there."
                        : hasGeolocationContext
                            ? "Known geolocation metadata is available only to prevent location guesses. Do not return city, country, region, landmark, road, address, GPS, coordinate, latitude, or longitude terms."
                        : "Do not add city, country, landmark, or region concepts from visual style alone.",
                    ...this.getLinguisticPromptInstructions(this.settings.vaultLinguisticFeatures),
                    relationshipInstruction,

                    "Avoid category drift. Do not add concepts based merely on association, mood, style, genre, setting, co-occurrence, popularity, or recency.",
                    "Do not add a vault concept only because it is common, recent, or listed.",
                    "For every selection, copy the shortest supporting word or phrase exactly from the supplied evidence. Use a concise type such as word-family, synonym, compound, spelling, acronym, or broader-narrower. Add an integer confidence from 0 to 100 for the direct relationship itself; use lower scores when the mapping is ambiguous.",
                    "Do not include markdown, hashtags, explanations, paths, or duplicate terms.",
                ].join(" "),
            },
            {
                role: "user",
                content: [
                    `Folder tag keyword candidates (${folderMode}): ${folderTagCandidateHint}`,
                    `Filename keyword candidates (${this.settings.filenameCandidateMode}): ${filenameCandidateHint}`,
                    hasGeolocationContext
                        ? `${geolocationAllowedForAiTags ? "Known geolocation metadata" : "Known geolocation metadata (do not return as tags)"}: ${geolocationContextText.trim()}`
                        : "",
                    `Base generated tags: ${baseTags.length > 0 ? baseTags.join(", ") : "none"}`,
                    "Image description:",
                    aiDescription.trim() || "none",
                    semanticHints.length > 0 ? `Retrieval hints (not evidence): ${semanticHints.join(", ")}` : "",
                    `Known vault vocabulary candidates: ${vaultVocabularyHint}`,
                    "",
                    'Return JSON only with clearly evidenced candidate IDs and reusable evidence relations, or an empty array: {"vaultSelections":[{"id":"c1","evidence":"exact evidence text","type":"word-family","confidence":85}]}',
                ].filter(line => line !== "").join("\n"),
            },
        ];
    }
    async selectVaultAwareTags(
        baseTags: string[],
        aiDescription: string,
        filenameCandidates: string[],
        folderTagCandidates: string[],
        folderStrongTagCandidates: string[],
        folderExcludedTagCandidates: string[],
        folderMode: CandidateMode,
        geolocationContextText: string,
        endpoint: string,
        model: string,
        learningEvidenceTags: string[] = baseTags,
        semanticHints: string[] = []
    ): Promise<string[]> {
        if (!this.settings.vaultAwarenessEnabled || !this.settings.selfLearningBridgeEnabled) {
            return [];
        }
        await this.ensureVaultVocabularyCacheReady();

        const vaultEvidenceText = [
            folderTagCandidates.join(" "),
            filenameCandidates.join(" "),
            geolocationContextText,
            learningEvidenceTags.join(" "),
            aiDescription,
        ].join(" ");
        const rankedVocabularyTerms = this.getRankedVaultVocabularyTerms(
            folderTagCandidates,
            filenameCandidates,
            geolocationContextText,
            learningEvidenceTags,
            aiDescription,
            semanticHints,
            folderExcludedTagCandidates,
            folderStrongTagCandidates
        );
        console.log("Autotag vault candidates:", rankedVocabularyTerms);
        if (rankedVocabularyTerms.length === 0) {
            return [];
        }

        const candidateMatches = this.buildVaultCandidateMatches(
            rankedVocabularyTerms,
            folderTagCandidates,
            filenameCandidates,
            geolocationContextText,
            learningEvidenceTags,
            aiDescription,
            semanticHints
        );
        const localStructuralRelations = new Map<string, LocalStructuralRelation>();
        const locallyVerifiedStructuralMatches = candidateMatches.filter(match => {
            if (match.tier !== "structural") return false;
            const relation = this.getLocallyAcceptedStructuralRelation(
                match.candidate,
                folderTagCandidates,
                filenameCandidates,
                geolocationContextText,
                learningEvidenceTags,
                aiDescription
            );
            if (!relation) return false;
            localStructuralRelations.set(match.candidate.toLowerCase(), relation);
            return true;
        });
        const locallyVerifiedStructuralKeys = new Set(
            locallyVerifiedStructuralMatches.map(match => match.candidate.toLowerCase())
        );
        const locallyAccepted = candidateMatches
            .filter(match => match.tier === "exact"
                || match.tier === "aliases"
                || match.tier === "learned"
                || locallyVerifiedStructuralKeys.has(match.candidate.toLowerCase()))
            .map(match => match.candidate);
        const unresolvedMatches = candidateMatches.filter(match =>
            (match.tier === "structural" && !locallyVerifiedStructuralKeys.has(match.candidate.toLowerCase()))
            || match.tier === "semantic"
        );
        let relationshipChangesPending = false;
        if (locallyVerifiedStructuralMatches.length > 0) {
            const localRelationshipJson = JSON.stringify({
                relations: locallyVerifiedStructuralMatches.map(match => ({
                    candidate: match.candidate,
                    evidence: localStructuralRelations.get(match.candidate.toLowerCase())?.evidence ?? match.evidence,
                    type: localStructuralRelations.get(match.candidate.toLowerCase())?.relationType ?? "word-family",
                    confidence: localStructuralRelations.get(match.candidate.toLowerCase())?.requiresCorroboration ? 92 : 97,
                })),
            });
            relationshipChangesPending = this.rememberLearnedVaultRelations(
                localRelationshipJson,
                locallyVerifiedStructuralMatches.map(match => match.candidate),
                vaultEvidenceText,
                "Autotag structural matcher"
            ) || relationshipChangesPending;
        }
        if (unresolvedMatches.length === 0) {
            if (relationshipChangesPending) await this.persistVaultRelationshipChanges();
            return this.normalizeUniqueAiTags(locallyAccepted).slice(0, this.settings.maxVaultAwareAdditions);
        }

        const promptItems: VaultCandidatePromptItem[] = unresolvedMatches.map((match, index) => ({
            id: `c${index + 1}`,
            match,
        }));
        const promptItemById = new Map(promptItems.map(item => [item.id, item]));
        const vaultVocabularyHint = promptItems
            .map(item => {
                const label = this.settings.vaultMatchingTiers.aliases && this.settings.vaultLinguisticFeatures.vaultAliases !== "exclude"
                    ? this.getVaultPromptLabel(item.match.candidate)
                    : item.match.candidate;
                return `${item.id}: ${label} <- ${item.match.evidence} (${item.match.tier})`;
            })
            .join("\n");
        const filenameCandidateHint = filenameCandidates.length > 0 ? filenameCandidates.join(", ") : "none";
        const folderTagCandidateHint = folderTagCandidates.length > 0 ? folderTagCandidates.join(", ") : "none";

        const messages = this.buildOllamaVaultAwarenessMessages(
            baseTags,
            aiDescription,
            filenameCandidateHint,
            folderTagCandidateHint,
            folderMode,
            vaultVocabularyHint,
            geolocationContextText,
            semanticHints
        );
        const requestVariants = this.buildOllamaTagRequestVariants(model, messages).slice(0, 2);

        for (let attempt = 0; attempt < requestVariants.length; attempt++) {
            try {
                const response = await this.runOllamaInference(() => requestUrl({
                    url: endpoint,
                    method: "POST",
                    throw: false,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestVariants[attempt]),
                }));

                if (response.status < 200 || response.status >= 300) {
                    console.warn("Autotag vault awareness attempt failed", {
                        attempt: attempt + 1,
                        model,
                        status: response.status,
                        body: response.text?.slice(0, 300) || "no response body",
                    });
                    continue;
                }

                const rawText = this.extractOllamaMessageText(response.json);
                console.log(`Autotag vault awareness raw response (attempt ${attempt + 1}):`, rawText);
                if (!this.isValidVaultAwarenessResponse(rawText)) continue;

                const parsedSelections = this.parseVaultCandidateSelections(rawText, promptItems);
                const verifiedRelations: { evidence: string; candidate: string; relationType: string; confidence?: number }[] = [];
                const aiAccepted = parsedSelections.map(selection => {
                    const promptItem = promptItemById.get(selection.id);
                    if (!promptItem) return null;
                    const term = promptItem.match.candidate;
                    const match = promptItem.match;
                    let relationType = selection.relationType;
                    let relationEvidence = selection.evidence;
                    const returnedRelationIsValid = this.isLearnedVaultRelationTypeEnabled(relationType)
                        && this.hasLearnedRelationEvidence(relationEvidence, vaultEvidenceText)
                        && this.isLearnedVaultRelationStructurallyPlausible(relationEvidence, term, relationType);
                    let relationConfidence = returnedRelationIsValid ? selection.confidence : undefined;

                    if (!returnedRelationIsValid && match.tier === "structural") {
                        const localRelationType = this.getStructuralVaultRelationType(match.evidence, term);
                        if (localRelationType && this.isLearnedVaultRelationTypeEnabled(localRelationType)) {
                            relationType = localRelationType;
                            relationEvidence = match.evidence;
                            relationConfidence = undefined;
                        }
                    }
                    if (!relationType
                        || !this.hasLearnedRelationEvidence(relationEvidence, vaultEvidenceText)
                        || !this.isLearnedVaultRelationStructurallyPlausible(relationEvidence, term, relationType)) return null;
                    const normalizedConfidence = this.getLearnedVaultRelationConfidence(
                        relationType,
                        model,
                        relationConfidence,
                        1
                    );
                    if (normalizedConfidence < this.settings.learnedVaultRelationMinimumConfidence) return null;
                    verifiedRelations.push({
                        evidence: relationEvidence,
                        candidate: term,
                        relationType,
                        confidence: normalizedConfidence,
                    });
                    return term;
                }).filter((term): term is string => !!term);
                const accepted = this.normalizeUniqueAiTags([...locallyAccepted, ...aiAccepted])
                    .slice(0, this.settings.maxVaultAwareAdditions);
                const verifiedRelationshipJson = JSON.stringify({
                    relations: verifiedRelations.map(relation => ({
                        candidate: relation.candidate,
                        evidence: relation.evidence,
                        type: relation.relationType,
                        confidence: relation.confidence,
                    })),
                });
                relationshipChangesPending = this.rememberLearnedVaultRelations(
                    verifiedRelationshipJson,
                    aiAccepted,
                    vaultEvidenceText,
                    model
                ) || relationshipChangesPending;
                relationshipChangesPending = this.rememberRejectedVaultRelationships(
                    unresolvedMatches,
                    aiAccepted,
                    model
                ) || relationshipChangesPending;
                if (relationshipChangesPending) await this.persistVaultRelationshipChanges();
                return accepted;
            } catch (e) {
                console.warn("Autotag vault awareness attempt threw", {
                    attempt: attempt + 1,
                    model,
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }
        if (relationshipChangesPending) await this.persistVaultRelationshipChanges();
        return this.normalizeUniqueAiTags(locallyAccepted).slice(0, this.settings.maxVaultAwareAdditions);
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
        file: TFile | null = null,
        geolocationContext: ImageGeolocationContext | null = null,
        folderGeneratedValues: string[] = folderCandidateValues,
        folderExcludedCandidateValues: string[] = [],
        folderStrongCandidateValues: string[] = folderCandidateValues,
        folderConsiderCandidateValues: string[] = [],
        timings?: ProcessingTimings
    ): Promise<GeneratedAiTagResult> {
        const runTimed = <T>(stage: string, task: () => Promise<T>): Promise<T> =>
            timings ? timings.measure(stage, task) : task();
        const filenameCandidates = this.getFilenameKeywordCandidates(file);
        const folderStrongTagCandidates = this.getFolderTagCandidates(folderStrongCandidateValues);
        const folderConsiderTagCandidates = this.getFolderTagCandidates(folderConsiderCandidateValues);
        const folderExcludedTagCandidates = this.getFolderTagCandidates(folderExcludedCandidateValues);
        const folderTagCandidates = this.normalizeUniqueAiTags([...folderStrongTagCandidates, ...folderConsiderTagCandidates]);
        const activeFilenameCandidates = this.isCandidateSourceActive(this.settings.filenameCandidateMode) ? filenameCandidates : [];
        const activeFolderTagCandidates = folderTagCandidates;
        const geolocationContextText = this.formatGeolocationContextForAiTags(geolocationContext);
        const bridgeGeolocationContextText = this.formatGeolocationContextForDescription(geolocationContext);
        const descriptionText = aiDescription?.trim() ?? "";
        const canUseFilenameOnly = this.settings.filenameCandidateMode === "all" && filenameCandidates.length > 0;
        const canUseFolderOnly = folderStrongTagCandidates.length > 0;
        const canUseGeolocationOnly = geolocationContextText.length > 0 && !this.settings.removeGeolocationFromAiTags;
        const folderPromptMode = this.getFolderCandidatePromptMode(
            folderStrongTagCandidates,
            folderConsiderTagCandidates,
            folderExcludedTagCandidates
        );
        const buildDirectBridgeAiTags = () => {
            const directBridgeTags = this.expandAiTagsWithKnownVocabulary(
                [],
                activeFilenameCandidates,
                activeFolderTagCandidates,
                folderExcludedTagCandidates,
                bridgeGeolocationContextText
            );
            const aiTagsWithoutFilenameNoise = this.filterFilenameNoiseFromAiTags(directBridgeTags, file);
            return this.filterGeolocationTermsFromAiTags(
                this.filterFolderTermsFromAiTags(aiTagsWithoutFilenameNoise, folderGeneratedValues),
                geolocationContext
            );
        };

        if (!this.settings.aiTaggingEnabled) {
            return { aiTags: buildDirectBridgeAiTags(), vaultAwarenessTags: [] };
        }

        if (!descriptionText && !canUseFilenameOnly && !canUseFolderOnly && !canUseGeolocationOnly) {
            return { aiTags: buildDirectBridgeAiTags(), vaultAwarenessTags: [] };
        }

        const endpoint = this.getOllamaChatUrl();
        const model = this.settings.ollamaModel.trim();

        if (!endpoint || !model) {
            const directBridgeTags = buildDirectBridgeAiTags();
            if (directBridgeTags.length > 0) {
                return { aiTags: directBridgeTags, vaultAwarenessTags: [] };
            }
            new Notice("Ollama settings are incomplete");
            return { aiTags: [], vaultAwarenessTags: [] };
        }

        const filenameCandidateHint = activeFilenameCandidates.length > 0 ? activeFilenameCandidates.join(", ") : "none";
        const folderTagCandidateHint = this.formatFolderCandidatePromptHint(
            folderStrongTagCandidates,
            folderConsiderTagCandidates,
            folderExcludedTagCandidates
        );
        console.log("Autotag filename candidates:", filenameCandidates);
        console.log("Autotag folder tag candidates:", {
            all: folderStrongTagCandidates,
            consider: folderConsiderTagCandidates,
            excluded: folderExcludedTagCandidates,
        });
        if (geolocationContextText) console.log("Autotag geolocation AI tag context:", geolocationContextText);
        const messages = this.buildOllamaTagMessages(
            descriptionText,
            filenameCandidateHint,
            this.settings.filenameCandidateMode,
            folderTagCandidateHint,
            folderPromptMode,
            geolocationContextText
        );
        const requestVariants = this.buildOllamaTagRequestVariants(model, messages);

        let lastError = "unknown error";
        let lastRawText = "";

        for (let attempt = 0; attempt < requestVariants.length; attempt++) {
            const requestBody = requestVariants[attempt];

            try {
                const response = await runTimed("ai-tags-model", () =>
                    this.runOllamaInference(() => requestUrl({
                        url: endpoint,
                        method: "POST",
                        throw: false,
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(requestBody),
                    }))
                );

                if (response.status < 200 || response.status >= 300) {
                    lastError = `HTTP ${response.status}: ${response.text?.slice(0, 300) || "no response body"}`;
                    console.warn("Autotag Ollama attempt failed", {
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
                console.log(`Autotag Ollama raw response (attempt ${attempt + 1}):`, rawText);

                const tags = this.parseAiTags(rawText);
                const vaultLookupHints = this.parseAiVaultLookupHints(rawText);
                if (tags.length > 0 || this.isValidVaultAwarenessResponse(rawText)) {
                    const canonicalTags = this.filterUnsupportedCandidateEchoTags(
                        tags.map(tag =>
                            this.canonicalizeVaultTerm(tag, this.settings.vaultLinguisticFeatures.canonicalization === "use")
                        ),
                        descriptionText,
                        activeFolderTagCandidates,
                        geolocationContextText
                    );
                    if (tags.length > 0 && canonicalTags.length === 0) {
                        lastError = "response only contained unsupported folder candidate echoes";
                        console.warn("Autotag removed unsupported folder candidate echoes from Ollama response", tags);
                        continue;
                    }
                    const bridgeTags = await runTimed("bridge-enrichment", () => this.applySubjectBridgeTags(
                        canonicalTags,
                        descriptionText,
                        activeFilenameCandidates,
                        activeFolderTagCandidates,
                        bridgeGeolocationContextText,
                        endpoint,
                        model
                    ));
                    const tagsWithBridges = [...canonicalTags, ...bridgeTags];
                    const vaultTags = await runTimed("self-learning", () =>
                        this.runVaultAwarenessSelection(() => this.selectVaultAwareTags(
                            tagsWithBridges,
                            descriptionText,
                            activeFilenameCandidates,
                            activeFolderTagCandidates,
                            folderStrongTagCandidates,
                            folderExcludedTagCandidates,
                            folderPromptMode,
                            geolocationContextText,
                            endpoint,
                            model,
                            canonicalTags,
                            vaultLookupHints
                        ))
                    );
                    const postVaultBridgeTags = this.settings.bridgeUsePreBridgeVaultAwarenessOutput
                        ? this.applyDeterministicSubjectBridgeTags(
                            [...tagsWithBridges, ...vaultTags],
                            descriptionText,
                            activeFilenameCandidates,
                            activeFolderTagCandidates,
                            bridgeGeolocationContextText
                        )
                        : [];
                    const vaultAwarenessTags = this.filterUnsupportedCandidateEchoTags(
                        this.normalizeUniqueAiTags([...vaultTags, ...postVaultBridgeTags]),
                        descriptionText,
                        activeFolderTagCandidates,
                        geolocationContextText
                    );
                    const includeVaultAwarenessInAiTags = !this.settings.vaultAwarenessOutputEnabled || !this.settings.vaultAwarenessOutputExclusive;
                    const aiTagInputs = includeVaultAwarenessInAiTags
                        ? [...tagsWithBridges, ...vaultAwarenessTags]
                        : tagsWithBridges;
                    const excludedVaultAwarenessTags = new Set(
                        includeVaultAwarenessInAiTags
                            ? []
                            : vaultAwarenessTags.map(tag => tag.toLowerCase())
                    );
                    const expandedAiTags = this.expandAiTagsWithKnownVocabulary(aiTagInputs, filenameCandidates, folderTagCandidates, folderExcludedTagCandidates, bridgeGeolocationContextText)
                        .filter(tag => !excludedVaultAwarenessTags.has(tag.toLowerCase()));
                    const aiTagsWithoutFilenameNoise = this.filterFilenameNoiseFromAiTags(expandedAiTags, file);
                    const aiTags = this.filterGeolocationTermsFromAiTags(
                        this.filterFolderTermsFromAiTags(aiTagsWithoutFilenameNoise, folderGeneratedValues),
                        geolocationContext
                    );

                    return { aiTags, vaultAwarenessTags, hadAiTagResponse: true };
                }

                if (rawText.trim()) {
                    lastError = "response contained no parseable aitags";
                    console.warn("Autotag: Ollama returned text but no aitags were parsed", rawText);
                } else {
                    lastError = "empty Ollama response";
                }
            } catch (e) {
                lastError = e instanceof Error ? e.message : String(e);
                console.warn("Autotag Ollama attempt threw", {
                    attempt: attempt + 1,
                    model,
                    error: lastError,
                });
            }
        }

        console.error("Autotag: all Ollama tag attempts failed", {
            model,
            lastError,
            lastRawText,
        });
        const directBridgeTags = buildDirectBridgeAiTags();
        if (directBridgeTags.length > 0) {
            console.warn("Autotag: Ollama semantic tags failed; writing deterministic direct Bridge tags.", directBridgeTags);
            return { aiTags: directBridgeTags, vaultAwarenessTags: [] };
        }
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

    normalizeOllamaModelNameForCompare(modelName: string): string {
        return modelName.trim().toLowerCase().replace(/:latest$/, "");
    }

    hasPulledOllamaModel(pulledModels: string[], selectedModel: string): boolean {
        const normalizedSelected = this.normalizeOllamaModelNameForCompare(selectedModel);
        return pulledModels.some(model => this.normalizeOllamaModelNameForCompare(model) === normalizedSelected);
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

    parseAiVaultLookupHints(content: unknown): string[] {
        if (typeof content !== "string" || !content.trim()) return [];
        const cleaned = this.stripThinkBlocks(content)
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
        try {
            const jsonStart = cleaned.indexOf("{");
            const jsonEnd = cleaned.lastIndexOf("}");
            if (jsonStart === -1 || jsonEnd === -1) return [];
            const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
            const values = parsed?.vaultHints ?? parsed?.vaultLookupHints;
            return Array.isArray(values)
                ? this.normalizeAiTagValues(values).slice(0, 20)
                : [];
        } catch {
            return [];
        }
    }

    isValidVaultAwarenessResponse(content: string): boolean {
        const cleaned = this.stripThinkBlocks(content)
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
        try {
            const jsonStart = cleaned.indexOf("{");
            const jsonEnd = cleaned.lastIndexOf("}");
            if (jsonStart === -1 || jsonEnd === -1) return false;
            const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
            return !!parsed
                && typeof parsed === "object"
                && !Array.isArray(parsed)
                && (Array.isArray(parsed.aitags) || Array.isArray(parsed.relations) || Array.isArray(parsed.vaultSelections));
        } catch {
            return false;
        }
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

    getRetryWaitMs(retryNumber: number): number {
        const initialWaitSeconds = this.clampSetting(
            this.settings.retryInitialWaitSeconds,
            DEFAULT_SETTINGS.retryInitialWaitSeconds,
            1,
            30
        );
        return initialWaitSeconds * 1000 * Math.max(1, Math.round(retryNumber));
    }

    getFailedFile(path: string): FailedProcessingFile | undefined {
        return this.settings.failedFiles.find(file => this.areVaultPathsSame(file.path, path));
    }

    hasReachedMaxAttempts(path: string): boolean {
        const failedFile = this.getFailedFile(path);
        return !!failedFile && failedFile.attempts >= this.settings.maxProcessingAttempts;
    }

    clearFailedFile(path: string): boolean {
        const index = this.settings.failedFiles.findIndex(file => this.areVaultPathsSame(file.path, path));
        if (index !== -1) {
            this.settings.failedFiles.splice(index, 1);
            return true;
        }
        return false;
    }
    getProtectedJob(path: string): ProtectedProcessingJob | undefined {
        return this.settings.protectedJobs.find(job => this.areVaultPathsSame(job.path, path));
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
        this.settings.protectedJobs = this.settings.protectedJobs.filter(job => !this.areVaultPathsSame(job.path, path));
        return this.settings.protectedJobs.length !== before;
    }

    updatePendingGeocodeJobsForRename(oldPath: string, newPath: string): boolean {
        let changed = false;
        this.settings.pendingGeocodeJobs = this.settings.pendingGeocodeJobs.map(job => {
            const updated = { ...job };
            if (this.areVaultPathsSame(updated.imagePath, oldPath)) {
                updated.imagePath = newPath;
                changed = true;
            }
            if (this.areVaultPathsSame(updated.notePath, oldPath)) {
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
        let recoveredProcessedMarkers = 0;

        for (const job of jobs) {
            const processedIndex = this.settings.processedFiles.findIndex(processedPath => this.areVaultPathsSame(processedPath, job.path));
            if (processedIndex !== -1) {
                this.settings.processedFiles.splice(processedIndex, 1);
                recoveredProcessedMarkers += 1;
            }
            if (this.hasReachedMaxAttempts(job.path)) {
                continue;
            }
            const file = this.getVaultFileByPathFlexible(job.path);
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

        if (removed > 0 || recoveredProcessedMarkers > 0) await this.saveSettings();
        if (shutdownResumed > 0) {
            new Notice(`Autotag Shutdown Protection resumed ${shutdownResumed} file${shutdownResumed === 1 ? "" : "s"}.`);
        }
        if (manualVaultResumed > 0) {
            new Notice(`Autotag resumed ${manualVaultResumed} manually queued vault file${manualVaultResumed === 1 ? "" : "s"}.`);
        }
    }
    getFailureCategory(reason: string): string {
        const normalized = reason.toLowerCase();
        if (normalized.includes("bfm note not found")
            || normalized.includes("companion note not found")
            || normalized.includes("companion note could not be created")
            || normalized.includes("companion note creation was not verified")) return "Companion note could not be created";
        if (normalized.includes("ai image analyzer returned no description") || normalized.includes("image analysis returned no description")) return "Image analysis returned no description";
        if (normalized.includes("ollama did not return")) return "Ollama returned no AI tags";
        if (normalized.includes("could not load image") || normalized.includes("visual duplicate hash failed")) return "Image preview or visual hash failed";
        if (normalized.includes("permission") || normalized.includes("eperm") || normalized.includes("access") || normalized.includes("denied")) return "File permission or sync lock";
        if (normalized.includes("failed to fetch") || normalized.includes("econnrefused") || normalized.includes("network") || normalized.includes("ollama")) return "Local Ollama connection failed";
        if (normalized.includes("yaml") || normalized.includes("frontmatter") || normalized.includes("parse")) return "Template or frontmatter parsing problem";
        return "Unexpected processing error";
    }

    getFailureSolutions(reason: string): string[] {
        const category = this.getFailureCategory(reason);
        if (category === "Companion note could not be created") {
            return [
                "Check that the Companion Note Folder points to the folder where companion notes should be created.",
                "Check that Companion Note Name Format creates the expected note name for this image.",
                "Increase Companion note creation retries in Processing & Queue if notes appear slowly or sync delays are involved.",
                "Check whether another file or folder already exists at the expected companion note path.",
            ];
        }
        if (category === "Image analysis returned no description") {
            return [
                "Check that Image Analysis is enabled and the selected Ollama vision model is pulled.",
                "Try a different vision model if this file type or image does not return a description.",
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
            "Open the developer console and look for the full Autotag error near the time of failure.",
            "If the same file fails repeatedly, copy the failed-file list and inspect the exact reason text.",
        ];
    }

    getFailureNoticeText(file: TFile, reason: string, attempts: number): string {
        const category = this.getFailureCategory(reason);
        return `Autotag failed (${attempts}/${this.settings.maxProcessingAttempts}): ${category} - ${file.name}`;
    }

    buildFailureHelpNoteContent(): string {
        const recentFailures = [...this.settings.failedFiles]
            .sort((a, b) => b.lastFailedAt - a.lastFailedAt)
            .slice(0, 10);
        const lines = [
            "# Autotag Failure Help",
            "",
            "This note was generated by Autotag. You may delete it after reading.",
            "",
            recentFailures.length > 0
                ? `Recent failed files: ${recentFailures.length}`
                : "No failed files are currently tracked.",
            "",
        ];

        if (recentFailures.length === 0) {
            lines.push("## General Checks", "", "- Check that the source folder, companion-note folder, and companion-note name format match your vault workflow.", "- Check that Image Analysis and Ollama tagging are enabled only when you want them used.", "- Check the developer console if something stops without a visible notice.", "");
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
        const notePath = "Autotag Failure Help.md";
        const content = this.buildFailureHelpNoteContent();
        const existing = this.app.vault.getAbstractFileByPath(notePath);
        let note: TFile;
        if (existing instanceof TFile) {
            await this.app.vault.modify(existing, content);
            note = existing;
        } else {
            note = await this.app.vault.create(notePath, content);
        }
        const currentNote = note.path.trim() ? this.app.vault.getFileByPath(note.path) : null;
        if (!(currentNote instanceof TFile)) {
            new Notice("The failure help note was created, but its vault path could not be resolved.");
            return;
        }
        try {
            await this.app.workspace.getLeaf(false).openFile(currentNote);
            new Notice("Autotag failure help note opened. You may delete it after reading.");
        } catch (error) {
            console.warn("Autotag could not open the failure help note", currentNote.path, error);
            new Notice(`Could not open ${currentNote.name}.`);
        }
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
            await this.sleep(this.getRetryWaitMs(attempts));
            const currentFailure = this.getFailedFile(file.path);
            const currentFile = this.getVaultFileByPathFlexible(file.path);
            if (currentFailure?.attempts === attempts && currentFile instanceof TFile) {
                this.enqueueFile(currentFile, true, "shutdown", true);
            }
        } else if (shouldRetry) {
            new Notice(`Autotag stopped retrying. Open the failure help note for likely fixes: ${file.name}`, 10000);
        }
    }

    async retryFailedFiles(): Promise<void> {
        const failedFiles = [...this.getFailedFileRecordsNeedingAttention()];
        let queued = 0;

        for (const failedFile of failedFiles) {
            const file = this.getVaultFileByPathFlexible(failedFile.path);
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
        const failedFiles = this.getFailedFileRecordsNeedingAttention();
        const failedPathKeys = new Set(failedFiles.map(file => this.getVaultPathKey(file.path)));
        const count = failedFiles.length;
        this.settings.failedFiles = this.settings.failedFiles.filter(file => !failedPathKeys.has(this.getVaultPathKey(file.path)));
        await this.saveSettings();
        new Notice(`Cleared ${count} failed file${count === 1 ? "" : "s"}.`);
    }
    buildForgottenFilesNoteContent(files: TFile[], missingPaths: string[], totalProcessedBefore: number): string {
        const timestamp = new Date().toLocaleString();
        const lines = [
            "# Autotag Forgotten Files",
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
            `- Companion notes are listed from the current Companion Note Name Format setting.`,
            "",
            "## Previously Processed Files",
            "",
        ];

        files.forEach(file => {
            lines.push(`- [[${file.path}]]`, `- [[${this.getCompanionNotePath(file)}]]`);
        });

        if (missingPaths.length > 0) {
            lines.push("", "## Missing Paths", "");
            missingPaths.forEach(path => lines.push(`- ${path}`));
        }

        return lines.join("\n");
    }

    async createForgottenFilesNote(files: TFile[], missingPaths: string[], totalProcessedBefore: number): Promise<void> {
        const notePath = "Autotag Forgotten Files.md";
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
        const pendingPaths = this.getPendingHealthPathKeys();
        return this.getHashableBaseFiles().filter(file =>
            !processedPaths.has(file.path)
            && !this.getFailedFile(file.path)
            && !protectedPaths.has(file.path)
            && !this.isPathPendingHealthEvaluation(file.path, pendingPaths)
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
        const file = this.getVaultFileByPathFlexible(path);
        if (!(file instanceof TFile) || file.extension.toLowerCase() === "md" || !this.isPathInBasePath(file.path)) {
            new Notice("Select an image/source file inside the watched Base Path.");
            return;
        }
        if (this.isPathProcessing(file.path)) {
            new Notice(`${file.name} is already queued or processing.`);
            return;
        }

        const beforeProcessedCount = this.settings.processedFiles.length;
        this.settings.processedFiles = this.settings.processedFiles.filter(processedPath => !this.areVaultPathsSame(processedPath, file.path));
        let changed = beforeProcessedCount !== this.settings.processedFiles.length;
        if (this.clearFailedFile(file.path)) changed = true;
        if (this.removeProtectedJob(file.path)) changed = true;
        if (changed) await this.saveSettings();

        this.enqueueFile(file, true, "manual-vault-reprocess");
        new Notice(`Queued ${file.name} for processing.`);
    }

    async processCompanionNoteAgain(notePath: string): Promise<void> {
        const note = this.getVaultFileByPathFlexible(notePath);
        if (!(note instanceof TFile) || note.extension.toLowerCase() !== "md" || !this.isPathInBfmNewFileLocation(note.path)) {
            new Notice("Select a companion note inside the Companion Note Folder.");
            return;
        }
        const file = this.findSourceFileForCompanionNote(note.path);
        if (!(file instanceof TFile) || file.extension.toLowerCase() === "md" || !this.isPathInBasePath(file.path)) {
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
        const file = this.getVaultFileByPathFlexible(path);
        if (!(file instanceof TFile) || file.extension.toLowerCase() === "md" || !this.isPathInBasePath(file.path)) {
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

        const expectedNotePath = this.getCompanionNotePath(file);
        const createdNote = await this.createMissingCompanionNote(file, expectedNotePath);
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
                        note = await this.createMissingCompanionNote(file, this.getCompanionNotePath(file), false);
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
                console.warn("Autotag existing vault companion note backfill failed", file.path, error);
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
        const files = this.getUnprocessedFilesNeedingDuplicateIndex();
        const total = files.length;
        const totalSteps = Math.max(1, total * 2);
        const progress = this.showProgressNotice(
            "Indexing existing files",
            total > 0 ? `Checking companions 0/${total}` : "No unprocessed files need indexing.",
            totalSteps
        );

        if (total === 0) {
            progress.setProgress(1, "No unprocessed files need indexing.");
            window.setTimeout(() => progress.hide(), 1600);
            return;
        }

        const companionSummary = await this.backfillExistingVaultCompanionNotes(files, (done, count) => {
            progress.setProgress(done, `Checking companions ${done}/${count}`);
        });

        const records: DuplicateRecord[] = [];
        let hashFailed = 0;
        let skippedWithoutCompanion = 0;
        const shouldComputeVisualHash = this.settings.duplicateDetectionMode === "exact-visual";

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
                                console.warn("Autotag existing vault visual hash failed", file.path, error);
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
                console.warn("Autotag existing vault duplicate indexing failed", file.path, error);
            }

            progress.setProgress(total + index + 1, `Hashing ${index + 1}/${total}`);
            if ((index + 1) % 20 === 0) await this.sleep(1);
        }

        const indexedPathKeys = new Set(records.map(record => this.getVaultPathKey(record.filePath)));
        this.settings.duplicateRecords = [
            ...this.getDuplicateRecords().filter(record => !indexedPathKeys.has(this.getVaultPathKey(record.filePath))),
            ...records,
        ];
        this.backfillPairRecordsFromDuplicateRecords();
        await this.saveSettings();

        const disabledNotice = this.isDuplicateProtectionActive()
            ? ""
            : " Duplicate detection is currently off; the prepared hashes are saved and will be used after selecting a duplicate detection mode.";
        const message = `Indexed ${records.length}/${total} unprocessed file${total === 1 ? "" : "s"} that needed indexing. Created ${companionSummary.created} companion note${companionSummary.created === 1 ? "" : "s"}; skipped ${skippedWithoutCompanion} without companions; ${hashFailed} hash failure${hashFailed === 1 ? "" : "s"}.${disabledNotice}`;
        progress.setProgress(totalSteps, message);
        window.setTimeout(() => progress.hide(), 2600);
        new Notice(message);
    }

    applyCompanionNameTokenCase(value: string, token: string, suffix: string | undefined, mode: CompanionNameCaseMode = "current"): string {
        const normalizedSuffix = suffix?.toUpperCase();
        if (normalizedSuffix === "UP") return value.toUpperCase();
        if (normalizedSuffix === "LOW") return value.toLowerCase();
        if (token === token.toUpperCase()) return value.toUpperCase();
        if (/^[A-Z][a-z]+$/.test(token)) {
            return mode === "legacy-title-lower" && value.length > 0
                ? `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`
                : value;
        }
        return value.toLowerCase();
    }

    renderCompanionNoteNameFormat(file: TFile): string {
        return this.renderCompanionNoteNameFormatFromParts(file.name, file.path, file.extension);
    }

    renderCompanionNoteNameFormatFromParts(fileName: string, filePath: string, extension: string, mode: CompanionNameCaseMode = "current"): string {
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        const link = `[[${filePath}]]`;
        const embed = `![[${filePath}]]`;
        const format = this.getEffectiveCompanionNoteNameFormat();

        const rendered = format.replace(/\{\{(name|filename|fullname|extension|path|link|embed)(?::(UP|LOW))?\}\}/gi, (_match, token: string, suffix: string | undefined) => {
            const normalizedToken = token.toUpperCase();
            const value = normalizedToken === "NAME"
                ? nameWithoutExt
                : normalizedToken === "FILENAME" || normalizedToken === "FULLNAME"
                    ? fileName
                    : normalizedToken === "EXTENSION"
                        ? extension
                        : normalizedToken === "PATH"
                            ? filePath
                            : normalizedToken === "LINK"
                                ? link
                                : embed;

            if (normalizedToken === "PATH" || normalizedToken === "LINK" || normalizedToken === "EMBED") {
                return value;
            }
            return this.applyCompanionNameTokenCase(value, token, suffix, mode);
        });

        return rendered.endsWith(".md") ? rendered : `${rendered}.md`;
    }

    getCompanionNoteNamesForFile(file: TFile): string[] {
        const names = new Set<string>([
            this.renderCompanionNoteNameFormat(file),
            this.renderCompanionNoteNameFormatFromParts(file.name, file.path, file.extension, "legacy-title-lower"),
        ]);
        const recentlyMovedFromPath = this.recentAutoMovedSourcePaths.get(file.path);
        if (recentlyMovedFromPath) {
            names.add(this.renderCompanionNoteNameFormatFromParts(file.name, recentlyMovedFromPath, file.extension));
            names.add(this.renderCompanionNoteNameFormatFromParts(file.name, recentlyMovedFromPath, file.extension, "legacy-title-lower"));
        }
        return Array.from(names);
    }

    getCompanionConflictNoteNamesForFile(file: TFile): string[] {
        const names = new Set<string>(this.getCompanionNoteNamesForFile(file));
        const extension = file.extension || (file.name.includes(".") ? file.name.split(".").pop() ?? "" : "");
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const copyNumberMatch = nameWithoutExt.match(/^(.*)\s+\d+$/);
        if (copyNumberMatch) {
            const originalFileName = extension ? `${copyNumberMatch[1]}.${extension}` : copyNumberMatch[1];
            names.add(this.renderCompanionNoteNameFormatFromParts(originalFileName, file.path.replace(file.name, originalFileName), extension));
            names.add(this.renderCompanionNoteNameFormatFromParts(originalFileName, file.path.replace(file.name, originalFileName), extension, "legacy-title-lower"));
        }
        return Array.from(names);
    }

    getCompanionNotePath(file: TFile): string {
        const companionNoteName = this.renderCompanionNoteNameFormat(file);
        return `${this.getEffectiveCompanionNoteFolder()}/${companionNoteName}`;
    }

    getCompanionNoteCandidatePaths(file: TFile): string[] {
        const noteRoot = this.getEffectiveCompanionNoteFolder();
        return this.getCompanionNoteNamesForFile(file).map(name => `${noteRoot}/${name}`);
    }

    isCompanionConflictNoteName(noteName: string, formattedNoteName: string): boolean {
        return noteName.toLowerCase().startsWith("conflict-") && noteName.toLowerCase().endsWith(`-${formattedNoteName.toLowerCase()}`);
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
        if (owner && !pairId && !this.areVaultPathsSame(owner.imagePath, file.path)) return false;
        const linkedPath = this.getLinkedPathFromCompanionNote(note);
        const recentlyMovedFromPath = this.recentAutoMovedSourcePaths.get(file.path);
        if (
            linkedPath
            && !this.areVaultPathsSame(linkedPath, file.path)
            && !this.areVaultPathsSame(linkedPath, recentlyMovedFromPath)
        ) return false;
        return true;
    }

    findCompanionNoteVariant(file: TFile): TFile | null {
        const activePair = this.getActiveRunPairForPath(file.path);
        const pairRecord = activePair ? this.getPairRecordById(activePair.pairId) : this.getPairRecordForImagePath(file.path);
        const pairId = activePair?.pairId ?? pairRecord?.pairId;
        const existingPairNote = pairRecord?.notePath ? this.getVaultFileByPathFlexible(pairRecord.notePath) : null;
        if (existingPairNote instanceof TFile && this.isCompanionCandidateValidForFile(existingPairNote, file, pairId)) {
            return existingPairNote;
        }

        const candidateNames = new Set(this.getCompanionConflictNoteNamesForFile(file));
        const noteRoot = this.getEffectiveCompanionNoteFolder();
        const notes = this.app.vault.getMarkdownFiles()
            .filter(note => this.isPathInsideVaultFolder(note.path, noteRoot));
        const conflictNote = notes.find(note => {
            for (const candidateName of candidateNames) {
                if (this.isCompanionConflictNoteName(note.name, candidateName) && this.isCompanionCandidateValidForFile(note, file, pairId)) return true;
            }
            return false;
        });
        if (conflictNote instanceof TFile) return conflictNote;

        const candidatePaths = new Set(this.getCompanionNoteCandidatePaths(file));
        for (const candidatePath of candidatePaths) {
            const note = this.getVaultFileByPathFlexible(candidatePath);
            if (note instanceof TFile && this.isCompanionCandidateValidForFile(note, file, pairId)) return note;
        }

        const normalizedCandidateNames = new Set(Array.from(candidateNames).map(name => name.toLowerCase()));
        return notes.find(note =>
            normalizedCandidateNames.has(note.name.toLowerCase())
            && this.isCompanionCandidateValidForFile(note, file, pairId)
        ) ?? null;
    }
    doesCompanionNotePathMatchFile(notePath: string, file: TFile): boolean {
        const noteName = notePath.split("/").pop() ?? notePath;
        const exactNames = this.getCompanionNoteNamesForFile(file);
        const noteRoot = this.getEffectiveCompanionNoteFolder();
        if (exactNames.some(candidateName =>
            this.areVaultPathsSame(notePath, `${noteRoot}/${candidateName}`)
            || noteName.toLowerCase() === candidateName.toLowerCase()
        )) {
            return true;
        }
        return this.getCompanionConflictNoteNamesForFile(file).some(candidateName => this.isCompanionConflictNoteName(noteName, candidateName));
    }

    showProgressNotice(title: string, subtitle: string, total: number, showBar = true): ProgressNoticeController {
        const fragment = document.createDocumentFragment();
        const wrapper = fragment.createDiv({ cls: "autotag-progress-notice" });
        const header = wrapper.createDiv({ cls: "autotag-progress-header" });
        header.createDiv({ cls: "autotag-progress-spinner" });
        const text = header.createDiv({ cls: "autotag-progress-text" });
        text.createDiv({ text: title, cls: "autotag-progress-title" });
        const subtitleEl = text.createDiv({ cls: "autotag-progress-subtitle" });
        const fill = showBar
            ? wrapper.createDiv({ cls: "autotag-progress-bar" }).createDiv({ cls: "autotag-progress-fill" })
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
            const dotsEl = subtitleEl.createSpan({ cls: "autotag-loading-dots" });
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
            if (!this.settings.processedFiles.some(processedPath => this.areVaultPathsSame(processedPath, job.path))) paths.add(job.path);
        });
        return Array.from(paths);
    }

    getActiveProcessingImageFiles(): TFile[] {
        return Array.from(this.activeWorkerPaths)
            .map(path => this.getVaultFileByPathFlexible(path))
            .filter((file): file is TFile => file instanceof TFile && file.extension.toLowerCase() !== "md");
    }

    getQueuedProcessingImageCount(): number {
        const activePaths = new Set(Array.from(this.activeWorkerPaths).map(path => this.getVaultPathKey(path)));
        return this.getUniqueProcessingPaths()
            .filter(path => !activePaths.has(this.getVaultPathKey(path)))
            .filter(path => {
                const file = this.getVaultFileByPathFlexible(path);
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

    buildFolderMetadata(filePath: string): {
        folderCandidateValues: string[];
        folderStrongCandidateValues: string[];
        folderConsiderCandidateValues: string[];
        folderExcludedCandidateValues: string[];
        folderGeneratedValues: string[];
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
        const folderStrongCandidateValues: string[] = [];
        const folderConsiderCandidateValues: string[] = [];
        const folderExcludedCandidateValues: string[] = [];
        const folderGeneratedValues: string[] = [];
        const fallbackProperty = this.normalizeFolderFallbackProperty(this.settings.folderFallbackProperty);
        const addUnique = (values: string[], value: string) => {
            if (!values.includes(value)) values.push(value);
        };
        const addFolderValue = (property: string, value: string, format: string | undefined, aiCandidateMode: CandidateMode) => {
            const normalizedProperty = this.normalizeFolderFallbackProperty(property);
            const item = this.formatYamlListItem(value, format);
            const items = folderPropertyItems[normalizedProperty] ?? [];
            if (!items.includes(item)) {
                items.push(item);
            }
            folderPropertyItems[normalizedProperty] = items;

            addUnique(folderGeneratedValues, value);
            if (aiCandidateMode === "all") {
                addUnique(folderStrongCandidateValues, value);
                addUnique(folderCandidateValues, value);
            } else if (aiCandidateMode === "consider") {
                addUnique(folderConsiderCandidateValues, value);
                addUnique(folderCandidateValues, value);
            } else if (aiCandidateMode === "exclude") {
                addUnique(folderExcludedCandidateValues, value);
            }
        };

        const extension = normalizedFilePath.split(".").pop();
        const fileExt = extension || "unknown";
        const wikiLink = `[[${normalizedFilePath}]]`;
        const embedLink = `![[${normalizedFilePath}]]`;

        if (!this.settings.useFolderTags) {
            return {
                folderCandidateValues: [],
                folderStrongCandidateValues: [],
                folderConsiderCandidateValues: [],
                folderExcludedCandidateValues: [],
                folderGeneratedValues: [],
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
                    addFolderValue(mapping.property, part, mapping.format, this.getFolderMappingAiCandidateMode(mapping));
                    matchedPropertyList = true;
                }
            });

            if (!matchedPropertyList) {
                addFolderValue(fallbackProperty, part, this.settings.folderFallbackFormat, this.getFolderFallbackAiCandidateMode());
            }
        });

        return {
            folderCandidateValues,
            folderStrongCandidateValues,
            folderConsiderCandidateValues,
            folderExcludedCandidateValues,
            folderGeneratedValues,
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
            .map((mapping, index): FolderPropertyMapping => {
                const raw = mapping as Partial<FolderPropertyMapping>;
                const property = this.normalizeFolderFallbackProperty(raw.property);
                const values = Array.isArray(raw.values)
                    ? raw.values.map(value => String(value).trim()).filter(Boolean)
                    : [];
                const uniqueValues = Array.from(new Set(values));
                const valueSource: FolderPropertyValueSource = raw.valueSource === "automatic" ? "automatic" : "manual";
                const aiCandidateMode = this.normalizeCandidateMode(
                    raw.aiCandidateMode,
                    raw.useAsAiCandidate === false ? "disabled" : "all"
                );

                return {
                    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `${Date.now()}-${index}`,
                    property,
                    values: uniqueValues,
                    valueSource,
                    format: typeof raw.format === "string" ? raw.format : "",
                    aiCandidateMode,
                    useAsAiCandidate: aiCandidateMode === "all" || aiCandidateMode === "consider",
                    useAsVaultCandidate: raw.useAsVaultCandidate === true,
                };
            })
            .filter(mapping => mapping.property.length > 0);
    }

    getFolderPropertyManualMemoryKey(property: string | undefined): string {
        return (property ?? "")
            .trim()
            .replace(/\s+/g, "-")
            .toLowerCase();
    }

    normalizeManualFolderPropertyValues(values: unknown): string[] {
        if (!Array.isArray(values)) return [];
        const seen = new Set<string>();
        const normalizedValues: string[] = [];
        values.forEach(value => {
            const normalized = String(value).trim();
            const key = normalized.toLowerCase();
            if (!normalized || seen.has(key)) return;
            seen.add(key);
            normalizedValues.push(normalized);
        });
        return normalizedValues;
    }

    parseManualFolderPropertyValueInput(value: string): string[] {
        return this.normalizeManualFolderPropertyValues(value.split(","));
    }

    normalizeFolderPropertyManualValueMemory(memory: unknown): Record<string, string[]> {
        const normalized: Record<string, string[]> = {};
        if (!memory || typeof memory !== "object" || Array.isArray(memory)) return normalized;

        Object.entries(memory as Record<string, unknown>).forEach(([property, values]) => {
            const key = this.getFolderPropertyManualMemoryKey(property);
            if (!key) return;
            normalized[key] = this.normalizeManualFolderPropertyValues(values);
        });
        return normalized;
    }

    rememberFolderPropertyManualValues(property: string | undefined, values: string[]): void {
        const key = this.getFolderPropertyManualMemoryKey(property);
        if (!key) return;
        this.settings.folderPropertyManualValueMemory = this.normalizeFolderPropertyManualValueMemory(
            this.settings.folderPropertyManualValueMemory
        );
        this.settings.folderPropertyManualValueMemory[key] = this.normalizeManualFolderPropertyValues(values);
    }

    getRememberedFolderPropertyManualValues(property: string | undefined): string[] | null {
        const key = this.getFolderPropertyManualMemoryKey(property);
        if (!key) return null;
        const memory = this.settings.folderPropertyManualValueMemory ?? {};
        if (!Object.prototype.hasOwnProperty.call(memory, key)) return null;
        return [...this.normalizeManualFolderPropertyValues(memory[key])];
    }

    rememberManualFolderPropertyValuesFromMappings(): void {
        const mergedMemory = this.normalizeFolderPropertyManualValueMemory(this.settings.folderPropertyManualValueMemory);
        const valuesByProperty = new Map<string, string[]>();
        this.settings.folderPropertyMappings.forEach(mapping => {
            if (mapping.valueSource !== "manual") return;
            const key = this.getFolderPropertyManualMemoryKey(mapping.property);
            if (!key) return;
            valuesByProperty.set(key, [
                ...(valuesByProperty.get(key) ?? []),
                ...this.normalizeManualFolderPropertyValues(mapping.values),
            ]);
        });
        valuesByProperty.forEach((values, key) => {
            mergedMemory[key] = this.normalizeManualFolderPropertyValues(values);
        });
        this.settings.folderPropertyManualValueMemory = mergedMemory;
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

    normalizeVaultFolderPath(path: string | null | undefined): string {
        return (path ?? "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    }

    normalizeVaultPath(path: string | null | undefined): string {
        return (path ?? "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
    }

    getVaultPathKey(path: string | null | undefined): string {
        return this.normalizeVaultPath(path).toLowerCase();
    }

    areVaultPathsSame(pathA: string | null | undefined, pathB: string | null | undefined): boolean {
        const keyA = this.getVaultPathKey(pathA);
        const keyB = this.getVaultPathKey(pathB);
        return !!keyA && !!keyB && keyA === keyB;
    }

    hasPathKey<T>(map: Map<string, T>, path: string): boolean {
        if (map.has(path)) return true;
        const pathKey = this.getVaultPathKey(path);
        for (const existingPath of map.keys()) {
            if (this.getVaultPathKey(existingPath) === pathKey) return true;
        }
        return false;
    }

    getPathKeyValue<T>(map: Map<string, T>, path: string): T | undefined {
        const exact = map.get(path);
        if (exact !== undefined) return exact;
        const pathKey = this.getVaultPathKey(path);
        for (const [existingPath, value] of map.entries()) {
            if (this.getVaultPathKey(existingPath) === pathKey) return value;
        }
        return undefined;
    }

    deletePathKey<T>(map: Map<string, T>, path: string): boolean {
        let deleted = map.delete(path);
        const pathKey = this.getVaultPathKey(path);
        for (const existingPath of Array.from(map.keys())) {
            if (this.getVaultPathKey(existingPath) === pathKey) {
                map.delete(existingPath);
                deleted = true;
            }
        }
        return deleted;
    }

    getVaultAbstractFileByPathFlexible(path: string | null | undefined): TFile | TFolder | null {
        const normalizedPath = this.normalizeVaultPath(path);
        if (!normalizedPath) return null;
        const exact = this.app.vault.getAbstractFileByPath(normalizedPath);
        if (exact instanceof TFile || exact instanceof TFolder) return exact;

        const pathKey = this.getVaultPathKey(normalizedPath);
        const match = this.app.vault.getAllLoadedFiles()
            .find(file => (file instanceof TFile || file instanceof TFolder) && this.getVaultPathKey(file.path) === pathKey);
        return match instanceof TFile || match instanceof TFolder ? match : null;
    }

    getVaultFileByPathFlexible(path: string | null | undefined): TFile | null {
        const file = this.getVaultAbstractFileByPathFlexible(path);
        return file instanceof TFile ? file : null;
    }

    getEffectiveBasePath(): string {
        return this.normalizeVaultFolderPath(this.settings.basePath) || DEFAULT_SETTINGS.basePath;
    }

    isPathInsideVaultFolder(path: string, folderPath: string): boolean {
        const normalizedFolder = this.normalizeVaultFolderPath(folderPath);
        if (!normalizedFolder) return false;
        const pathKey = this.getVaultPathKey(path);
        const folderKey = this.getVaultPathKey(normalizedFolder);
        return pathKey === folderKey || pathKey.startsWith(`${folderKey}/`);
    }

    isPathInBasePath(path: string): boolean {
        return this.isPathInsideVaultFolder(path, this.getEffectiveBasePath());
    }

    isPathInBfmNewFileLocation(path: string): boolean {
        return this.isPathInsideVaultFolder(path, this.getEffectiveCompanionNoteFolder());
    }

    getEffectiveCompanionNoteFolder(): string {
        return this.normalizeVaultFolderPath(this.settings.companionNoteFolder) || DEFAULT_SETTINGS.companionNoteFolder;
    }

    getEffectiveCompanionNoteNameFormat(): string {
        return this.settings.companionNoteNameFormat?.trim() || DEFAULT_SETTINGS.companionNoteNameFormat;
    }

    getTemplateFilePath(): string | null {
        const normalized = this.normalizeVaultPath(this.settings.templateFilePath);
        return normalized || null;
    }

    getTemplateFileUnavailableMessage(): string | null {
        if (this.settings.templateSource !== "template-file") return null;
        const templatePath = this.getTemplateFilePath();
        if (!templatePath) return "No template file selected.";
        const file = this.getVaultFileByPathFlexible(templatePath);
        return file instanceof TFile ? null : `Template file not found: ${templatePath}`;
    }

    isTemplateSourceAvailable(): boolean {
        return this.getTemplateFileUnavailableMessage() === null;
    }

    getFrontmatterTextFromTemplateContent(content: string): string {
        const normalized = content.replace(/\r\n/g, "\n");
        const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
        return match ? match[1] : normalized;
    }

    getFrontmatterTextFromCachedTemplateFile(file: TFile): string | null {
        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (!frontmatter) return null;
        const properties = Object.keys(frontmatter)
            .map(property => property.trim())
            .filter(Boolean);
        return properties.length > 0 ? properties.map(property => `${property}:`).join("\n") : null;
    }

    getTemplateFileContent(): string | null {
        const templatePath = this.getTemplateFilePath();
        if (!templatePath) return null;
        const file = this.getVaultFileByPathFlexible(templatePath);
        if (!(file instanceof TFile)) return null;

        const fullPath = this.getFullVaultPath(file.path);
        if (fullPath) {
            try {
                const fs = require("fs") as typeof import("fs");
                return fs.readFileSync(fullPath, "utf8");
            } catch (error) {
                console.warn("Autotag could not read template file.", error);
            }
        }

        return null;
    }

    getTemplateFileFrontmatterText(): string | null {
        const templatePath = this.getTemplateFilePath();
        if (!templatePath) return null;
        const file = this.getVaultFileByPathFlexible(templatePath);
        if (!(file instanceof TFile)) return null;
        const templateContent = this.getTemplateFileContent();
        if (templateContent !== null) return this.getFrontmatterTextFromTemplateContent(templateContent);
        return this.getFrontmatterTextFromCachedTemplateFile(file);
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

    getActiveTemplateSuggestionGeneratedProperties(): string[] {
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
        if ((this.settings.aiTaggingEnabled || this.canRunDirectBridgeOutput()) && this.settings.aiTagsPropertyEnabled) {
            generated.push(this.getAiTagsPropertyName());
        }
        if (this.settings.aiDescriptionPropertyEnabled) {
            generated.push(this.getAiDescriptionPropertyName());
        }
        if (this.settings.aiTaggingEnabled && this.settings.vaultAwarenessEnabled && this.settings.vaultAwarenessOutputEnabled) {
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
        const properties = new Set<string>();
        this.getEnabledGeneratedFrontmatterProperties().forEach(property => properties.add(property));
        if (this.settings.geolocationEnabled) {
            this.getGeolocationPropertyNames().forEach(property => properties.add(property));
        }
        return properties;
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
        const existing = this.settings.pendingGeocodeJobs.find(job =>
            this.areVaultPathsSame(job.imagePath, imagePath)
            && this.areVaultPathsSame(job.notePath, notePath)
        );
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
            ...this.settings.pendingGeocodeJobs.filter(candidate =>
                !(this.areVaultPathsSame(candidate.imagePath, imagePath) && this.areVaultPathsSame(candidate.notePath, notePath))
            ),
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
                "User-Agent": "autotag Obsidian Plugin (personal geolocation lookup)",
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
        const buffer = await this.readFileBinaryCached(file);
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

    async ensureVaultFolder(folderPath: string): Promise<void> {
        const normalized = folderPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        if (!normalized) return;
        const parts = normalized.split("/").filter(Boolean);
        let current = "";
        for (const part of parts) {
            current = current ? current + "/" + part : part;
            const existing = this.getVaultAbstractFileByPathFlexible(current);
            if (existing instanceof TFolder) continue;
            if (existing) throw new Error("Cannot create folder because a file exists at " + current);
            await this.app.vault.createFolder(current);
        }
    }

    async resolveCreatedCompanionNote(expectedNotePath: string, created: TFile | null = null): Promise<TFile | null> {
        const resolve = () => {
            const createdFile = created instanceof TFile
                ? this.getVaultFileByPathFlexible(created.path)
                : null;
            if (createdFile instanceof TFile) return createdFile;

            const expectedFile = this.getVaultFileByPathFlexible(expectedNotePath);
            return expectedFile instanceof TFile ? expectedFile : null;
        };

        const immediate = resolve();
        if (immediate instanceof TFile) return immediate;

        for (const delayMs of [150, 350]) {
            await this.sleep(delayMs);
            const resolved = resolve();
            if (resolved instanceof TFile) return resolved;
        }

        return null;
    }

    async createMissingCompanionNote(file: TFile, expectedNotePath: string, showNotice = true): Promise<TFile | null> {
        const folderPath = expectedNotePath.split("/").slice(0, -1).join("/");
        await this.ensureVaultFolder(folderPath);

        const templateText = this.settings.templateSource === "internal"
            ? (this.settings.frontmatterTemplate ?? "").trim().replace(/^---\s*\n?/, "").replace(/\n?---$/, "").trim()
            : "";
        const templateFileContent = this.settings.templateSource === "template-file"
            ? this.getTemplateFileContent()
            : null;
        const initialContent = templateFileContent
            ? templateFileContent
            : templateText ? "---\n" + templateText + "\n---\n" : "---\n---\n";

        const retries = this.clampSetting(
            this.settings.companionNoteCreationRetries,
            DEFAULT_SETTINGS.companionNoteCreationRetries,
            0,
            5
        );
        let lastError: unknown = null;

        for (let attempt = 0; attempt <= retries; attempt += 1) {
            try {
                const created = await this.app.vault.create(expectedNotePath, initialContent);
                const verified = await this.resolveCreatedCompanionNote(expectedNotePath, created);
                if (verified instanceof TFile) {
                    if (showNotice) new Notice("Autotag created companion note: " + verified.name);
                    return verified;
                }
                lastError = new Error(`Companion note creation was not verified: ${expectedNotePath}`);
            } catch (error) {
                const expectedExisting = this.getVaultAbstractFileByPathFlexible(expectedNotePath);
                if (expectedExisting instanceof TFile) return expectedExisting;
                if (expectedExisting) throw new Error("Cannot create companion note because a folder exists at " + expectedNotePath);

                const existingVariant = this.findCompanionNoteVariant(file);
                if (existingVariant instanceof TFile) return existingVariant;

                lastError = error;
            }

            if (attempt < retries) {
                await this.sleep(this.getRetryWaitMs(attempt + 1));
            }
        }

        console.warn("Autotag could not verify companion note creation after retries.", {
            file: file.path,
            expectedNotePath,
            retries,
            error: lastError instanceof Error ? lastError.message : String(lastError ?? "unknown error"),
        });
        return null;
    }

    async getImageGeolocationContext(file: TFile, notePath: string): Promise<ImageGeolocationContext | null> {
        if (!this.settings.geolocationEnabled) return null;
        const coordinates = await this.readGpsCoordinates(file).catch(error => {
            console.warn("Autotag GPS metadata read failed", file.path, error);
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

    formatGeolocationContextForAiTags(context: ImageGeolocationContext | null): string {
        if (!this.settings.useGeolocationForAiTags) return "";
        return this.formatGeolocationContextForDescription(context);
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

    isSpeculativeImageCodeSentence(sentence: string): boolean {
        const text = sentence.trim();
        if (!text) return false;

        const hasCodeLikeToken = /\b[a-z]{1,8}[_-]?\d{3,}[a-z0-9_-]*\b/i.test(text)
            || /\b[a-f0-9]{10,}\b/i.test(text);
        if (!hasCodeLikeToken) return false;

        const mentionsUnsupportedIdentifier = /\b(?:image|photo|picture|file)?\s*(?:code|identifier|id)\b/i.test(text)
            || /\b(?:code|identifier|id)\b/i.test(text);
        const isSpeculative = /\b(?:might|may|could|possibly|potentially|probably|seems|appears|reference|series|specific viewpoint|doesn'?t provide|provide additional information)\b/i.test(text);

        return mentionsUnsupportedIdentifier && isSpeculative;
    }

    cleanHumanReadableAiDescriptionText(aiDescription: string | null): string | null {
        if (!aiDescription?.trim() || !this.settings.filenameCandidatesHumanReadableOnly) return aiDescription;

        const original = aiDescription.trim();
        const sentences = original.match(/[^.!?]+(?:[.!?]+|$)(?:\s+|$)/g) ?? [original];
        const cleaned = sentences
            .filter(sentence => !this.isSpeculativeImageCodeSentence(sentence))
            .join("")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        return cleaned || original;
    }

    async enhanceAiDescriptionWithGeolocation(aiDescription: string | null, context: ImageGeolocationContext | null): Promise<string | null> {
        const readableDescription = this.cleanHumanReadableAiDescriptionText(aiDescription);
        if (!readableDescription?.trim() || !this.settings.useGeolocationForAiDescription) return readableDescription;
        const contextText = this.formatGeolocationContextForDescription(context);
        if (!contextText) return readableDescription;

        const model = this.settings.ollamaModel.trim();
        if (!model) {
            return this.cleanHumanReadableAiDescriptionText(this.appendGeolocationContextToDescription(readableDescription, contextText));
        }

        const requestVariants = this.buildOllamaDescriptionRequestVariants(
            model,
            this.buildOllamaDescriptionGeolocationMessages(readableDescription, contextText)
        );

        for (let attempt = 0; attempt < requestVariants.length; attempt += 1) {
            try {
                const response = await this.runOllamaInference(() => requestUrl({
                    url: this.getOllamaChatUrl(),
                    method: "POST",
                    throw: false,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestVariants[attempt]),
                }));
                if (response.status < 200 || response.status >= 300) {
                    console.warn("Autotag geolocation description enhancement attempt failed", {
                        attempt: attempt + 1,
                        model,
                        status: response.status,
                        body: response.text?.slice(0, 300) || "no response body",
                    });
                    continue;
                }

                const revised = this.normalizeOllamaDescriptionText(this.extractOllamaMessageText(response.json));
                const cleanedRevised = this.cleanHumanReadableAiDescriptionText(revised);
                if (cleanedRevised) {
                    console.log(`Autotag geolocation-enhanced AI description (attempt ${attempt + 1}):`, cleanedRevised);
                    return cleanedRevised;
                }
            } catch (error) {
                console.warn("Autotag geolocation description enhancement attempt threw", {
                    attempt: attempt + 1,
                    model,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return this.cleanHumanReadableAiDescriptionText(this.appendGeolocationContextToDescription(readableDescription, contextText));
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

    removeLegacyTemplateOverwritePlaceholders(template: string): string {
        return template
            .replace(/^(\s*[A-Za-z0-9_-]+\s*:)\s*This text will be overwritten(?: by the AI image description\.)?\s*$/gim, "$1")
            .replace(/^\s*-\s*This text will be overwritten(?: by the AI image description\.)?\s*(?:\r?\n|$)/gim, "");
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
        const baseTemplate = this.settings.templateSource === "template-file"
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
        if (this.settings.vaultAwarenessOutputEnabled) {
            const vaultAwarenessProperty = this.getVaultAwarenessOutputPropertyName();
            propertyValues[vaultAwarenessProperty] = [];
            appendValues(
                vaultAwarenessProperty,
                this.formatYamlList(vaultAwarenessTags, this.settings.vaultAwarenessOutputFormat).split("\n").filter(Boolean)
            );
        }
        if (this.settings.aiDescriptionPropertyEnabled) {
            propertyValues[aiDescriptionProperty] = [`|\n${this.formatYamlBlock(aiDescription, "No description generated.")}`];
        }

        const templateProperties = template.order;
        const requiredProperties = this.settings.templateSource === "template-file"
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
        const keepEmptyGeneratedProperties = new Set<string>();
        if (this.settings.vaultAwarenessOutputEnabled) {
            keepEmptyGeneratedProperties.add(this.getVaultAwarenessOutputPropertyName());
        }
        const frontmatterLines = order
            .filter(property => propertyValues[property]?.length > 0
                || !generatedPropertyNames.has(property)
                || keepEmptyGeneratedProperties.has(property))
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
        if (this.settings.templateSource === "template-file") {
            return this.getTemplateFileFrontmatterText() ?? "";
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
        this.getActiveTemplateSuggestionGeneratedProperties().forEach(property => properties.add(property));

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
        const unavailableMessage = this.getTemplateFileUnavailableMessage();
        if (unavailableMessage) {
            return `${unavailableMessage} Select an existing Markdown template to enable checks and preview.`;
        }

        const previewFilePath = this.buildPreviewImagePath();
        const {
            folderPropertyItems,
            wikiLink,
            embedLink,
            fileExt,
        } = this.buildFolderMetadata(previewFilePath);
        if (this.settings.useFolderTags) {
            this.getFolderPropertyMappings().forEach(mapping => {
                const property = this.normalizeFolderFallbackProperty(mapping.property);
                if (!property || folderPropertyItems[property]?.length) return;
                folderPropertyItems[property] = [this.formatYamlListItem("Example", mapping.format)];
            });
        }
        const geolocationPropertyItems = this.buildPreviewGeolocationPropertyItems();
        const previewVaultAwarenessTags = this.settings.vaultAwarenessEnabled
            ? [
                "Known Vault Concept",
                ...(this.settings.bridgeEnabled && this.settings.bridgeUsePreBridgeVaultAwarenessOutput ? ["Pre-Bridge Concept"] : []),
            ]
            : [];
        const includeVaultAwarenessInAiTags = this.settings.vaultAwarenessEnabled
            && (!this.settings.vaultAwarenessOutputEnabled || !this.settings.vaultAwarenessOutputExclusive);
        const aiTags = this.settings.aiTagsPropertyEnabled
            ? this.settings.aiTaggingEnabled
                ? [
                    "Example Tag",
                    "Second Example",
                    ...(includeVaultAwarenessInAiTags ? previewVaultAwarenessTags : []),
                ]
                : this.canRunDirectBridgeOutput()
                    ? ["Bridge Expansion"]
                    : []
            : [];
        const aiDescription = this.settings.aiDescriptionPropertyEnabled
            ? "Example image description."
            : null;
        const existingNoteContent = this.settings.templateSource === "template-file"
            ? this.getTemplateFileContent()
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

    enqueueFile(file: TFile, forceRetry = false, source: ProtectedJobSource = "shutdown", immediateFlush = false): void {
        if (this.isUnloading) return;
        const filePath = file.path;

        if (this.isDeletionSuppressed(filePath)) return;
        if (file.extension.toLowerCase() === "md") return;
        if (!this.isPathInBasePath(filePath)) return;
        if (this.settings.processedFiles.some(processedPath => this.areVaultPathsSame(processedPath, filePath))) return;
        if (!forceRetry && this.hasReachedMaxAttempts(filePath)) return;

        this.showLimitedFileTypeWarning(file);

        if (this.queueBatchStartedAt === null) {
            this.queueBatchStartedAt = Date.now();
        }

        const runId = this.createRunId(filePath);
        const expectedNotePath = this.getCompanionNotePath(file);
        const pairRecord = this.ensurePairRecordForImage(filePath);
        this.currentRunIds.set(filePath, runId);
        this.registerActiveRunPair(runId, pairRecord.pairId, filePath, expectedNotePath);
        this.processingQueue.set(filePath, { file, runId });
        this.invalidateExpensiveHealthCounts();
        if (this.settings.shutdownProtectionEnabled) {
            this.upsertProtectedJob(filePath, { stage: "queued", notePath: expectedNotePath, source, runId });
        }
        void this.saveSettings();
        this.prefetchFileBinary(file);
        this.startDuplicateFingerprintPrecompute(file, runId);
        if (this.queueFlushTimer !== null) {
            window.clearTimeout(this.queueFlushTimer);
        }

        const elapsed = Date.now() - this.queueBatchStartedAt;
        const remainingBatchWindow = this.settings.queueBatchMaxWaitMs - elapsed;
        const delay = immediateFlush || remainingBatchWindow <= 0
            ? 0
            : Math.min(QUEUE_BATCH_DELAY_MS, remainingBatchWindow);

        this.queueFlushTimer = window.setTimeout(() => {
            this.queueFlushTimer = null;
            this.queueBatchStartedAt = null;
            void this.processQueue();
        }, delay);
    }
    async processQueue(): Promise<void> {
        if (this.isUnloading) return;
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
                            this.deletePathFromSet(this.activeWorkerPaths, item.file.path);
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
    async processQueuedFile(file: TFile, runId: string = this.getPathKeyValue(this.currentRunIds, file.path) ?? this.createRunId(file.path)): Promise<void> {
        const filePath = file.path;

        if (this.isUnloading) {
            this.clearFileBinaryCache(filePath);
            return;
        }
        if (!this.isCurrentRun(filePath, runId)) {
            this.clearFileBinaryCache(filePath);
            return;
        }
        if (this.isDeletionSuppressed(filePath, runId)) {
            this.cleanupProcessingStateForPath(filePath, runId);
            await this.saveSettings();
            this.clearFileBinaryCache(filePath);
            return;
        }
        if (this.settings.processedFiles.some(processedPath => this.areVaultPathsSame(processedPath, filePath))) {
            this.cleanupActiveRunPairsForPath(filePath, runId);
            this.markDuplicateProcessingComplete(filePath, runId);
            this.deletePathKey(this.currentRunIds, filePath);
            this.clearFileBinaryCache(filePath);
            return;
        }
        if (!this.isPathInBasePath(filePath)) {
            this.cleanupActiveRunPairsForPath(filePath, runId);
            this.markDuplicateProcessingComplete(filePath, runId);
            this.deletePathKey(this.currentRunIds, filePath);
            this.clearFileBinaryCache(filePath);
            return;
        }
        if (this.hasReachedMaxAttempts(filePath)) {
            this.cleanupActiveRunPairsForPath(filePath, runId);
            this.markDuplicateProcessingComplete(filePath, runId);
            this.deletePathKey(this.currentRunIds, filePath);
            new Notice(`Autotag skipped after max failures: ${file.name}`);
            this.clearFileBinaryCache(filePath);
            return;
        }

        const timings = new ProcessingTimings(filePath);
        let processingOutcome: "completed" | "failed" | "skipped" = "skipped";
        try {
            let notePath = this.activeRunPairs.get(runId)?.expectedNotePath ?? this.getCompanionNotePath(file);
            await this.saveProtectedJob(filePath, { stage: "companion-note", notePath, runId });
            const companionNote = await timings.measure("companion-note", () => this.createMissingCompanionNote(file, notePath));
            if (!this.isCurrentRun(filePath, runId)) return;
            if (companionNote) {
                notePath = companionNote.path;
                this.updateActiveRunPair(runId, { resolvedNotePath: companionNote.path });
                this.updatePairRecord(this.activeRunPairs.get(runId)?.pairId, { notePath: companionNote.path });
                this.updatePendingDuplicateAction(runId, { newNotePath: companionNote.path });
            }
            if (!companionNote) {
                this.cleanupActiveRunPairsForPath(filePath, runId);
                this.deletePathKey(this.currentRunIds, filePath);
                this.markDuplicateProcessingComplete(filePath, runId);
                this.removeProtectedJob(filePath);
                if (!this.isDeletionSuppressed(filePath, runId) && !this.isDeletionSuppressed(notePath)) {
                    await this.recordProcessingFailure(file, `Companion note could not be created: ${notePath}`, false);
                }
                return;
            }
            if (this.isDeletionSuppressed(filePath, runId) || this.isDeletionSuppressed(companionNote.path)) {
                this.cleanupProcessingStateForPath(filePath, runId);
                this.cleanupProcessingStateForPath(companionNote.path);
                await this.saveSettings();
                return;
            }

            const {
                folderCandidateValues,
                folderStrongCandidateValues,
                folderConsiderCandidateValues,
                folderExcludedCandidateValues,
                folderGeneratedValues,
                folderPropertyItems,
                wikiLink,
                embedLink,
                fileExt,
            } = this.buildFolderMetadata(filePath);

            const duplicateHandling = await timings.measure("duplicate-check", () => this.getPreparedDuplicateHandling(file, runId));
            if (!this.isCurrentRun(filePath, runId)) return;
            if (duplicateHandling.match && duplicateHandling.action === "delete-new-pair") {
                await this.deleteNewDuplicatePair(file, companionNote, runId);
                return;
            }
            await this.saveProtectedJob(filePath, { stage: "processing", notePath, runId });

            const geolocationContext = await timings.measure("geolocation", () => this.getImageGeolocationContext(file, notePath));
            const geolocationPropertyItems = this.buildGeolocationPropertyItemsFromContext(geolocationContext);
            const mergedFolderPropertyItems = folderPropertyItems;

            let aiDescription: string | null = null;
            let aiTags: string[] = [];
            let vaultAwarenessTags: string[] = [];

            {
                const shouldRunAiTagModel = this.settings.aiTaggingEnabled
                    && (this.settings.aiTagsPropertyEnabled || (this.settings.vaultAwarenessEnabled && this.settings.vaultAwarenessOutputEnabled));
                const shouldRunDirectBridgeMetadata = this.settings.aiTagsPropertyEnabled
                    && this.canRunDirectBridgeOutput();
                const shouldGenerateTagMetadata = shouldRunAiTagModel || shouldRunDirectBridgeMetadata;
                const shouldUseAiDescription = this.settings.aiDescriptionPropertyEnabled
                    || shouldRunAiTagModel;
                const shouldAnalyzeImage = this.settings.imageAnalysisEnabled && shouldUseAiDescription;
                aiDescription = shouldAnalyzeImage
                    ? await timings.measure("image-description", () => this.analyzeImageFile(file))
                    : null;
                if (shouldUseAiDescription) {
                    aiDescription = await timings.measure(
                        "description-context",
                        () => this.enhanceAiDescriptionWithGeolocation(aiDescription, geolocationContext)
                    );
                }
                if (!this.isCurrentRun(filePath, runId)) {
                    this.cleanupActiveRunPairsForPath(filePath, runId);
                    this.markDuplicateProcessingComplete(filePath, runId);
                    return;
                }

                if (aiDescription) {
                    console.log("Autotag AI description:", aiDescription);
                } else {
                    const needsAiDescription = shouldAnalyzeImage && (this.settings.aiDescriptionPropertyEnabled || shouldRunAiTagModel);
                    const geolocationTaggingAvailable = shouldGenerateTagMetadata
                        && this.formatGeolocationContextForAiTags(geolocationContext).length > 0;
                    const fallbackTaggingAvailable = shouldRunAiTagModel
                        && ((this.settings.filenameCandidateMode === "all" && this.getFilenameKeywordCandidates(file).length > 0)
                            || this.getFolderTagCandidates(folderStrongCandidateValues).length > 0
                            || geolocationTaggingAvailable);

                    if (needsAiDescription && !fallbackTaggingAvailable) {
                        console.warn("Autotag: Image analysis returned no description; writing the rest of the companion metadata.", file.basename);
                    }

                    if (fallbackTaggingAvailable) {
                        console.warn("Autotag: Image analysis returned no description; using filename, folder, or geolocation metadata for AI tagging.", file.basename);
                    }
                }

                const shouldGenerateAiTags = shouldGenerateTagMetadata;
                const generatedTags = shouldGenerateAiTags
                    ? await timings.measure("tagging-total", () => this.generateAiTags(
                        aiDescription,
                        folderCandidateValues,
                        file,
                        geolocationContext,
                        folderGeneratedValues,
                        folderExcludedCandidateValues,
                        folderStrongCandidateValues,
                        folderConsiderCandidateValues,
                        timings
                    ))
                    : { aiTags: [], vaultAwarenessTags: [] };
                aiTags = generatedTags.aiTags;
                vaultAwarenessTags = generatedTags.vaultAwarenessTags;
                if (!this.isCurrentRun(filePath, runId)) {
                    this.cleanupActiveRunPairsForPath(filePath, runId);
                    this.markDuplicateProcessingComplete(filePath, runId);
                    return;
                }
                if (shouldGenerateAiTags
                    && aiTags.length === 0
                    && (!this.settings.vaultAwarenessOutputEnabled || vaultAwarenessTags.length === 0)
                    && !generatedTags.hadAiTagResponse) {
                    console.warn("Autotag: Tag model returned no AI tags; writing the rest of the companion metadata.", file.basename);
                }

                if (shouldGenerateAiTags) {
                    console.log("Autotag aitags:", aiTags);
                    if (vaultAwarenessTags.length > 0) {
                        console.log("Autotag vault awareness tags:", vaultAwarenessTags);
                    } else if (this.settings.vaultAwarenessEnabled && this.settings.vaultAwarenessOutputEnabled) {
                        console.log("Autotag Vault Awareness completed with no accepted vocabulary matches.");
                    }
                }
            }

            const currentSourceFile = this.getVaultFileByPathFlexible(filePath);
            const currentCompanionNote = this.getVaultFileByPathFlexible(companionNote.path);
            if (!(currentSourceFile instanceof TFile) || !(currentCompanionNote instanceof TFile) || this.isDeletionSuppressed(filePath, runId) || this.isDeletionSuppressed(companionNote.path)) {
                this.cleanupProcessingStateForPath(filePath, runId);
                this.cleanupProcessingStateForPath(companionNote.path);
                await this.saveSettings();
                return;
            }

            const existingNoteContent = this.settings.templateSource === "template-file"
                ? await this.app.vault.read(currentCompanionNote)
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

            if (this.isDeletionSuppressed(filePath, runId) || this.isDeletionSuppressed(companionNote.path)) {
                this.cleanupProcessingStateForPath(filePath, runId);
                this.cleanupProcessingStateForPath(companionNote.path);
                await this.saveSettings();
                return;
            }
            if (!this.isCurrentRun(filePath, runId)) return;
            await this.saveProtectedJob(filePath, { stage: "writing", notePath, runId });
            await timings.measure("note-write", () => this.app.vault.modify(currentCompanionNote, yamlContent));
            if (this.isUnloading || !this.isCurrentRun(filePath, runId)) return;

            const finalDuplicateHandling = await timings.measure(
                "duplicate-finalize",
                () => this.finalizeDuplicateAction(file, currentCompanionNote, duplicateHandling, runId)
            );
            if (finalDuplicateHandling.action === "delete-new-pair") return;
            if (this.isUnloading || !this.isCurrentRun(filePath, runId)) return;
            const activePairAfterReplace = this.activeRunPairs.get(runId);
            const pairRecordAfterReplace = this.getPairRecordById(activePairAfterReplace?.pairId);
            const finalProcessedPath = finalDuplicateHandling.action === "replace-original-keep-original" && finalDuplicateHandling.match
                ? finalDuplicateHandling.match.record.filePath
                : pairRecordAfterReplace?.imagePath ?? filePath;
            const finalNotePath = pairRecordAfterReplace?.notePath ?? currentCompanionNote.path;
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
            if (this.isCurrentRun(filePath, runId)) this.deletePathKey(this.currentRunIds, filePath);
            this.removeProtectedJob(filePath);
            if (!this.settings.processedFiles.some(processedPath => this.areVaultPathsSame(processedPath, finalProcessedPath))) {
                this.settings.processedFiles.push(finalProcessedPath);
            }
            await timings.measure("final-persistence", () => this.saveSettings());
            processingOutcome = "completed";
        } catch (e) {
            processingOutcome = "failed";
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
            this.deletePathKey(this.currentRunIds, filePath);
            this.removeProtectedJob(filePath);
            const reason = e instanceof Error ? e.message : String(e);
            await this.recordProcessingFailure(file, reason);
        } finally {
            this.clearFileBinaryCache(filePath);
            this.invalidateExpensiveHealthCounts();
            timings.finish(processingOutcome);
        }
    }
    // =========================
    // ONLOAD BELOW
    // =========================

    async onload() {
        this.isUnloading = false;
        await this.loadSettings();
        this.scheduleVaultVocabularyCacheBuild(1500);
        this.app.workspace.onLayoutReady(() => this.scheduleVaultVocabularyCacheBuild(1500));
        this.app.workspace.onLayoutReady(() => void this.syncAutomaticFolderPropertyMappings());
        this.app.workspace.onLayoutReady(() => void this.syncLearnedVaultRelationsNote());
        this.settingTab = new AutotagSettingTab(this.app, this);
        this.addSettingTab(this.settingTab);

        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if (file instanceof TFile) {
                    this.addAutotagFileContextMenu(menu, file);
                }
            })
        );

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, info) => {
                const embeddedFile = this.resolveEditorEmbedFile(editor, info);
                if (embeddedFile instanceof TFile) {
                    this.addAutotagFileContextMenu(menu, embeddedFile);
                }
            })
        );

        this.app.workspace.onLayoutReady(() => {
            if (this.settings.autoProcessUnprocessedOnReload) {
                if (this.startupAutoProcessTimer !== null) {
                    window.clearTimeout(this.startupAutoProcessTimer);
                }
                this.startupAutoProcessTimer = window.setTimeout(() => {
                    this.startupAutoProcessTimer = null;
                    void this.processUnprocessedBaseFiles(true);
                }, 8000);
            }
        });

        this.registerEvent(
            this.app.metadataCache.on('resolved', () => {
                this.scheduleVaultVocabularyCacheBuild(1500);
            })
        );

        this.registerEvent(
            this.app.metadataCache.on('changed', (file, _data, cache) => {
                if (file instanceof TFile) {
                    this.indexVocabularyFile(
                        file,
                        cache?.frontmatter
                            ? cache.frontmatter as Record<string, unknown>
                            : null
                    );
                    void this.syncAutomaticFolderPropertyMappingsFromFile(file);
                }
            })
        );
        this.registerEvent(
            this.app.vault.on('create', async (file) => {
                if (!(file instanceof TFile)) return;
                this.invalidateExpensiveHealthCounts();
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
                    this.clearDeletionSuppression(this.getCompanionNotePath(file));
                }
                const fileToProcess = await this.moveNewFileIntoBasePathIfNeeded(file);
                if (fileToProcess instanceof TFile) {
                    this.enqueueFile(fileToProcess);
                }
            })
        );

        this.registerEvent(
            this.app.vault.on('delete', async (file) => {
                if (!(file instanceof TFile)) return;
                this.invalidateExpensiveHealthCounts();
                const filePath = file.path;
                this.removeVocabularyFile(filePath);
                if (file.extension.toLowerCase() === "md") {
                    this.scheduleAutomaticFolderPropertySync();
                }
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
                this.invalidateExpensiveHealthCounts();
                this.removeVocabularyFile(oldPath);
                this.indexVocabularyFile(file);
                if (file.extension.toLowerCase() === "md") {
                    this.scheduleAutomaticFolderPropertySync();
                }
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
                const activeRunId = this.getPathKeyValue(this.currentRunIds, oldPath);
                if (activeRunId) {
                    this.deletePathKey(this.currentRunIds, oldPath);
                    this.currentRunIds.set(file.path, activeRunId);
                    if (file.extension.toLowerCase() !== "md") {
                        this.updateActiveRunPair(activeRunId, { imagePath: file.path, expectedNotePath: this.getCompanionNotePath(file) });
                    }
                }
                const queuedItem = this.getPathKeyValue(this.processingQueue, oldPath);
                if (queuedItem) {
                    this.deletePathKey(this.processingQueue, oldPath);
                    this.processingQueue.set(file.path, { file, runId: queuedItem.runId });
                }
                if (this.hasPathInSet(this.activeWorkerPaths, oldPath)) {
                    this.deletePathFromSet(this.activeWorkerPaths, oldPath);
                    this.activeWorkerPaths.add(file.path);
                }
                const failedFile = this.getFailedFile(oldPath);
                let shouldSaveRenameState = false;
                if (failedFile) {
                    failedFile.path = file.path;
                    shouldSaveRenameState = true;
                }
                const renamedImageNotePath = file.extension.toLowerCase() === "md" ? undefined : this.getCompanionNotePath(file);
                if (this.updateDuplicateRecordsForRename(oldPath, file.path, renamedImageNotePath)) {
                    shouldSaveRenameState = true;
                }
                if (this.updateProtectedJobPath(oldPath, file.path, renamedImageNotePath)) {
                    shouldSaveRenameState = true;
                }
                if (this.updatePendingGeocodeJobsForRename(oldPath, file.path)) {
                    shouldSaveRenameState = true;
                }
                const index = this.settings.processedFiles.findIndex(processedPath => this.areVaultPathsSame(processedPath, oldPath));
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
        this.isUnloading = true;
        if (this.settings.shutdownProtectionEnabled) {
            this.currentRunIds.forEach((runId, path) => {
                const existing = this.getProtectedJob(path);
                const file = this.getVaultFileByPathFlexible(path);
                this.upsertProtectedJob(path, {
                    stage: existing?.stage ?? (this.activeWorkerPaths.has(path) ? "processing" : "queued"),
                    notePath: existing?.notePath ?? (file instanceof TFile ? this.getCompanionNotePath(file) : undefined),
                    source: existing?.source ?? "shutdown",
                    runId,
                });
            });
            const shutdownSnapshot = JSON.parse(JSON.stringify(this.settings)) as AutotagSettings;
            this.settingsSaveChain = this.settingsSaveChain
                .catch(error => console.warn("Autotag recovered from a settings save still running during unload", error))
                .then(() => this.saveData(shutdownSnapshot))
                .catch(error => console.warn("Autotag could not save its shutdown-protection snapshot", error));
        }
        if (this.startupAutoProcessTimer !== null) {
            window.clearTimeout(this.startupAutoProcessTimer);
            this.startupAutoProcessTimer = null;
        }

        if (this.vaultVocabularyBuildTimer !== null) {
            window.clearTimeout(this.vaultVocabularyBuildTimer);
            this.vaultVocabularyBuildTimer = null;
        }
        this.vaultVocabularyBuildGeneration += 1;

        if (this.automaticFolderPropertySyncTimer !== null) {
            window.clearTimeout(this.automaticFolderPropertySyncTimer);
            this.automaticFolderPropertySyncTimer = null;
        }

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
        this.invalidateExpensiveHealthCounts();
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

    getPluginFolderPath(): string {
        const configDir = typeof (this.app.vault as any).configDir === "string"
            ? (this.app.vault as any).configDir
            : ".obsidian";
        const pluginDir = this.manifest.dir || `${configDir}/plugins/${this.manifest.id}`;
        return pluginDir.replace(/\\/g, "/").replace(/\/+/g, "/");
    }

    getSettingsProfileFolderPath(): string {
        return `${this.getPluginFolderPath()}/${SETTINGS_PROFILE_FOLDER_NAME}`;
    }

    getFullVaultPath(path: string): string | null {
        const normalizedPath = path.trim();
        if (!normalizedPath) return null;
        const adapter = this.app.vault.adapter;
        if (adapter instanceof FileSystemAdapter) {
            const fullPath = adapter.getFullPath(normalizedPath);
            return typeof fullPath === "string" && fullPath.trim() ? fullPath : null;
        }
        const fallbackAdapter = adapter as unknown as { getFullPath?: (path: string) => string };
        if (typeof fallbackAdapter.getFullPath !== "function") return null;
        const fullPath = fallbackAdapter.getFullPath(normalizedPath);
        return typeof fullPath === "string" && fullPath.trim() ? fullPath : null;
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

    mergeBridgeRuleTexts(...texts: unknown[]): string {
        const seen = new Set<string>();
        const lines: string[] = [];
        texts.forEach(text => {
            if (typeof text !== "string") return;
            text
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean)
                .forEach(line => {
                    const key = line.toLowerCase();
                    if (seen.has(key)) return;
                    seen.add(key);
                    lines.push(line);
                });
        });
        return lines.join("\n");
    }

    migrateLegacySettingsShape(source: unknown): Partial<AutotagSettings> {
        if (!source || typeof source !== "object" || Array.isArray(source)) return {};
        const migrated: Record<string, unknown> = { ...(source as Record<string, unknown>) };

        if (!Object.prototype.hasOwnProperty.call(migrated, "learnedVaultRelationMinimumConfidence")) {
            migrated.learnedVaultRelationMinimumConfidence = DEFAULT_SETTINGS.learnedVaultRelationMinimumConfidence;
            if (migrated.learnedVaultRelationCacheLimit === 500) {
                migrated.learnedVaultRelationCacheLimit = DEFAULT_SETTINGS.learnedVaultRelationCacheLimit;
            }
        }

        if (typeof migrated.companionNoteFolder !== "string" && typeof migrated.bfmNewFileLocation === "string") {
            migrated.companionNoteFolder = migrated.bfmNewFileLocation;
        }
        if (typeof migrated.companionNoteNameFormat !== "string" && typeof migrated.bfmFileNameFormat === "string") {
            migrated.companionNoteNameFormat = migrated.bfmFileNameFormat;
        }
        if (typeof migrated.bridgeRules !== "string") {
            migrated.bridgeRules = this.mergeBridgeRuleTexts(
                migrated.manualSubjectBridgeRules,
                migrated.manualEnrichmentRules
            );
        }
        if (migrated.useDuplicateProtection === false && migrated.duplicateDetectionMode !== "off") {
            migrated.duplicateDetectionMode = "off";
        }

        const legacyFolderCandidateMode = this.isValidCandidateMode(migrated.folderTagsCandidateMode)
            ? migrated.folderTagsCandidateMode as CandidateMode
            : undefined;
        if (Array.isArray(migrated.folderPropertyMappings)) {
            migrated.folderPropertyMappings = migrated.folderPropertyMappings.map(rawMapping => {
                if (!rawMapping || typeof rawMapping !== "object" || Array.isArray(rawMapping)) return rawMapping;
                const mapping = { ...(rawMapping as Record<string, unknown>) };
                if (!this.isValidCandidateMode(mapping.aiCandidateMode)) {
                    mapping.aiCandidateMode = mapping.useAsAiCandidate === false
                        ? "disabled"
                        : legacyFolderCandidateMode ?? DEFAULT_SETTINGS.folderFallbackAiCandidateMode;
                }
                mapping.useAsAiCandidate = this.isCandidateSourceActive(mapping.aiCandidateMode as CandidateMode);
                return mapping;
            });
        }
        if (!this.isValidCandidateMode(migrated.folderFallbackAiCandidateMode) && legacyFolderCandidateMode) {
            migrated.folderFallbackAiCandidateMode = migrated.folderFallbackUseAsAiCandidate === false
                ? "disabled"
                : legacyFolderCandidateMode;
        }

        delete migrated.bfmNewFileLocation;
        delete migrated.bfmFileNameFormat;
        delete migrated.bfmNewFileLocationSource;
        delete migrated.bfmFileNameFormatSource;
        delete migrated.useDuplicateProtection;
        delete migrated.folderTagsCandidateMode;
        delete migrated.manualEnrichmentRules;
        delete migrated.manualSubjectBridgeRules;
        delete migrated.clearDropdownExcludedProperties;

        return migrated as Partial<AutotagSettings>;
    }

    getProfileControlledSettings(source: Partial<AutotagSettings>): Partial<AutotagSettings> {
        const profileSettings: Partial<AutotagSettings> = {};
        const migratedSource = this.migrateLegacySettingsShape(source);
        SETTINGS_PROFILE_CONTROLLED_KEYS.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(migratedSource, key)) {
                (profileSettings as any)[key] = this.cloneSettingsValue((migratedSource as any)[key]);
            }
        });
        return profileSettings;
    }

    getCompleteProfileControlledSettings(source: Partial<AutotagSettings>): Partial<AutotagSettings> {
        return {
            ...this.getProfileControlledSettings(DEFAULT_SETTINGS),
            ...this.getProfileControlledSettings(source),
        };
    }

    serializeSettingsProfileSettings(settings: Partial<AutotagSettings>): string {
        return JSON.stringify(this.getCompleteProfileControlledSettings(settings));
    }

    getBuiltInSettingsProfiles(): SettingsProfileSummary[] {
        const defaultSettings = this.getProfileControlledSettings(DEFAULT_SETTINGS);
        const devSettings = this.getCompleteProfileControlledSettings(BUILTIN_DEV_PROFILE_SETTINGS);
        const featureTestSettings = this.getCompleteProfileControlledSettings(BUILTIN_FEATURE_TEST_PROFILE_SETTINGS);
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
                settings: devSettings,
            },
            {
                id: BUILTIN_FEATURE_TEST_SETTINGS_PROFILE_ID,
                name: "Feature Test",
                custom: false,
                builtIn: true,
                settings: featureTestSettings,
            },
        ];
    }

    parseSettingsProfileJson(text: string, fallbackName: string): SettingsProfileFile {
        const parsed = JSON.parse(text) as SettingsProfileFile | Partial<AutotagSettings>;
        const settings = parsed && typeof parsed === "object" && "settings" in parsed
            ? (parsed as SettingsProfileFile).settings
            : parsed as Partial<AutotagSettings>;
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
            console.warn("Autotag could not read settings profile", path, error);
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
            console.warn("Autotag could not list settings profiles", error);
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
        settings: Partial<AutotagSettings>,
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
            console.warn("Autotag settings profile import failed", error);
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
            title: "Export Autotag setup",
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
            console.warn("Autotag settings profile save dialog unavailable", error);
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
            console.warn("Autotag settings profile export failed", error);
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
            this.settings.imageAnalysisEnabled = this.settings.aiDescriptionPropertyEnabled;
            this.settings.folderPropertyMappings = this.normalizeFolderPropertyMappings(this.settings.folderPropertyMappings);
            this.settings.folderPropertyManualValueMemory = this.normalizeFolderPropertyManualValueMemory(
                this.settings.folderPropertyManualValueMemory
            );
            this.rememberManualFolderPropertyValuesFromMappings();
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
            console.warn("Autotag could not sync setup profile", error);
        }
    }

    async loadSettings() {
        let loadedSettings: any = null;
        let lastLoadError: unknown = null;
        for (let attempt = 1; attempt <= 4; attempt += 1) {
            try {
                loadedSettings = await this.loadData();
                lastLoadError = null;
                break;
            } catch (error) {
                lastLoadError = error;
                console.warn(`Autotag settings load attempt ${attempt} failed`, error);
                if (attempt < 4) await this.sleep(attempt * 100);
            }
        }
        if (lastLoadError) throw lastLoadError;
        const migratedSettings = this.migrateLegacySettingsShape(loadedSettings);
        this.settings = Object.assign({}, DEFAULT_SETTINGS, migratedSettings);
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
        const loadedVaultMatchingTiers = loadedSettings?.vaultMatchingTiers as Partial<VaultMatchingTierSettings> | undefined;
        this.settings.vaultMatchingTiers = {
            exact: loadedVaultMatchingTiers?.exact !== false,
            aliases: loadedVaultMatchingTiers?.aliases !== false,
            learned: loadedVaultMatchingTiers?.learned !== false,
            structural: loadedVaultMatchingTiers?.structural !== false,
            semantic: loadedVaultMatchingTiers?.semantic !== false,
        };
        this.settings.bridgeEnabled = this.settings.bridgeEnabled === true;
        this.settings.manualEnrichmentEnabled = this.settings.manualEnrichmentEnabled !== false;
        this.settings.selfLearningBridgeEnabled = this.settings.selfLearningBridgeEnabled !== false;
        this.settings.bridgeUseAiInput = this.settings.bridgeUseAiInput !== false;
        this.settings.bridgeUseFilenameInput = this.settings.bridgeUseFilenameInput !== false;
        this.settings.bridgeUseFolderInput = this.settings.bridgeUseFolderInput !== false;
        this.settings.bridgeUseGeolocationInput = this.settings.bridgeUseGeolocationInput !== false;
        this.settings.hideBridgeLinguisticFeatures = this.settings.hideBridgeLinguisticFeatures !== false;
        this.settings.hideVaultLinguisticFeatures = this.settings.hideVaultLinguisticFeatures !== false;


        if (!Array.isArray(this.settings.failedFiles)) {
            this.settings.failedFiles = [];
        }
        this.settings.shutdownProtectionEnabled = this.settings.shutdownProtectionEnabled === true;
        this.settings.autoProcessUnprocessedOnReload = this.settings.autoProcessUnprocessedOnReload === true;
        this.settings.deleteLinkedFilePair = this.settings.deleteLinkedFilePair !== false;
        const validShutdownStages: ShutdownProtectionStage[] = ["queued", "fingerprinted", "companion-note", "duplicate-decision", "waiting-duplicate-choice", "processing", "writing"];
        if (!Array.isArray(this.settings.protectedJobs)) {
            this.settings.protectedJobs = [];
        } else {
            const seenProtectedJobs = new Set<string>();
            const normalizeProtectedJobSource = (source: unknown): ProtectedJobSource => source === "manual-vault-reprocess" ? "manual-vault-reprocess" : "shutdown";
            this.settings.protectedJobs = this.settings.protectedJobs
                .filter(job => job && typeof job.path === "string" && job.path.trim().length > 0 && (job as { source?: unknown }).source !== "forget-all")
                .map(job => {
                    const rawStage = (job as { stage?: unknown }).stage;
                    const normalizedStage = rawStage === "waiting-bfm-note" ? "companion-note" : rawStage;
                    return {
                        ...job,
                        path: job.path.trim(),
                        stage: validShutdownStages.includes(normalizedStage as ShutdownProtectionStage) ? normalizedStage as ShutdownProtectionStage : "queued",
                        queuedAt: typeof job.queuedAt === "number" ? job.queuedAt : Date.now(),
                        updatedAt: typeof job.updatedAt === "number" ? job.updatedAt : Date.now(),
                        source: normalizeProtectedJobSource(job.source),
                    };
                })
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
        this.settings.moveOutsideFilesToBasePath = this.settings.moveOutsideFilesToBasePath === true;
        if (typeof this.settings.companionNoteFolder !== "string" || this.settings.companionNoteFolder.trim().length === 0) {
            this.settings.companionNoteFolder = DEFAULT_SETTINGS.companionNoteFolder;
        }
        if (typeof this.settings.ollamaBaseUrl !== "string" || this.settings.ollamaBaseUrl.trim().length === 0) {
            this.settings.ollamaBaseUrl = DEFAULT_SETTINGS.ollamaBaseUrl;
        }
        if (typeof this.settings.companionNoteNameFormat !== "string" || this.settings.companionNoteNameFormat.trim().length === 0) {
            this.settings.companionNoteNameFormat = DEFAULT_SETTINGS.companionNoteNameFormat;
        }
        this.settings.folderPropertyMappings = this.normalizeFolderPropertyMappings(this.settings.folderPropertyMappings);
        if (this.settings.folderPropertyMappings.length === 0) {
            this.settings.folderPropertyMappings = DEFAULT_SETTINGS.folderPropertyMappings.map(mapping => ({ ...mapping, values: [...mapping.values] }));
        }
        this.settings.folderPropertyManualValueMemory = this.normalizeFolderPropertyManualValueMemory(
            this.settings.folderPropertyManualValueMemory
        );
        this.rememberManualFolderPropertyValuesFromMappings();
        this.settings.folderFallbackProperty = this.normalizeFolderFallbackProperty(this.settings.folderFallbackProperty);
        this.settings.folderFallbackFormat = typeof this.settings.folderFallbackFormat === "string" ? this.settings.folderFallbackFormat : DEFAULT_SETTINGS.folderFallbackFormat;
        this.settings.folderFallbackAiCandidateMode = this.normalizeCandidateMode(
            this.settings.folderFallbackAiCandidateMode,
            this.settings.folderFallbackUseAsAiCandidate === false
                ? "disabled"
                : DEFAULT_SETTINGS.folderFallbackAiCandidateMode
        );
        this.settings.folderFallbackUseAsAiCandidate = this.isCandidateSourceActive(this.settings.folderFallbackAiCandidateMode);
        this.settings.folderFallbackUseAsVaultCandidate = this.settings.folderFallbackUseAsVaultCandidate === true;
        if (this.settings.templateSource !== "internal" && this.settings.templateSource !== "template-file") {
            this.settings.templateSource = DEFAULT_SETTINGS.templateSource;
        }
        if (typeof this.settings.frontmatterTemplate !== "string") {
            this.settings.frontmatterTemplate = DEFAULT_SETTINGS.frontmatterTemplate;
        }
        this.settings.frontmatterTemplate = this.removeLegacyTemplateOverwritePlaceholders(
            this.settings.frontmatterTemplate
        );
        this.settings.templateFilePath = typeof this.settings.templateFilePath === "string"
            ? this.normalizeVaultPath(this.settings.templateFilePath)
            : DEFAULT_SETTINGS.templateFilePath;
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
        if (!this.isValidCandidateMode(this.settings.filenameCandidateMode)) {
            this.settings.filenameCandidateMode = DEFAULT_SETTINGS.filenameCandidateMode;
        }
        this.settings.filenameCandidatesHumanReadableOnly = this.settings.filenameCandidatesHumanReadableOnly !== false;
        this.settings.bridgeUsePreBridgeVaultAwarenessOutput = this.settings.bridgeUsePreBridgeVaultAwarenessOutput !== false;
        this.settings.learnedVaultRelationCacheLimit = this.clampSetting(
            this.settings.learnedVaultRelationCacheLimit,
            DEFAULT_SETTINGS.learnedVaultRelationCacheLimit,
            50,
            5000
        );
        this.settings.learnedVaultRelationMinimumConfidence = this.clampSetting(
            this.settings.learnedVaultRelationMinimumConfidence,
            DEFAULT_SETTINGS.learnedVaultRelationMinimumConfidence,
            0,
            100
        );
        const learnedRelationKeys = new Set<string>();
        this.settings.learnedVaultRelations = Array.isArray(this.settings.learnedVaultRelations)
            ? this.settings.learnedVaultRelations
                .filter(relation => relation && typeof relation.evidence === "string" && typeof relation.candidate === "string")
                .map(relation => ({
                    evidence: this.normalizeAiTagName(relation.evidence),
                    candidate: this.normalizeAiTagName(relation.candidate),
                    relationType: typeof relation.relationType === "string" && relation.relationType.trim()
                        ? relation.relationType.trim().toLowerCase()
                        : "related",
                    model: typeof relation.model === "string" ? relation.model : "",
                    confidence: this.getLearnedVaultRelationConfidence(
                        typeof relation.relationType === "string" ? relation.relationType : "related",
                        typeof relation.model === "string" ? relation.model : "",
                        relation.confidence,
                        this.clampSetting(relation.confirmations, 1, 1, Number.MAX_SAFE_INTEGER)
                    ),
                    pinned: relation.pinned === true,
                    confirmations: this.clampSetting(relation.confirmations, 1, 1, Number.MAX_SAFE_INTEGER),
                    createdAt: typeof relation.createdAt === "number" ? relation.createdAt : Date.now(),
                    lastConfirmedAt: typeof relation.lastConfirmedAt === "number" ? relation.lastConfirmedAt : Date.now(),
                    lastUsedAt: typeof relation.lastUsedAt === "number" ? relation.lastUsedAt : 0,
                }))
                .filter(relation => relation.confidence >= this.settings.learnedVaultRelationMinimumConfidence)
                .filter(relation => {
                    if (!relation.evidence || !relation.candidate) return false;
                    const key = `${relation.evidence.toLowerCase()}\n${relation.candidate.toLowerCase()}`;
                    if (learnedRelationKeys.has(key)) return false;
                    learnedRelationKeys.add(key);
                    return true;
                })
                .sort((a, b) => {
                    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
                    return b.lastConfirmedAt - a.lastConfirmedAt;
                })
                .slice(0, this.settings.learnedVaultRelationCacheLimit)
            : [];
        const rejectedRelationKeys = new Set<string>();
        const rejectedCutoff = Date.now() - REJECTED_VAULT_RELATION_TTL_MS;
        this.settings.rejectedVaultRelations = Array.isArray(this.settings.rejectedVaultRelations)
            ? this.settings.rejectedVaultRelations
                .filter(relation => relation && typeof relation.evidence === "string" && typeof relation.candidate === "string")
                .map(relation => ({
                    evidence: this.normalizeAiTagName(relation.evidence),
                    candidate: this.normalizeAiTagName(relation.candidate),
                    model: typeof relation.model === "string" ? relation.model : "",
                    rejectedAt: typeof relation.rejectedAt === "number" ? relation.rejectedAt : Date.now(),
                    lastSeenAt: typeof relation.lastSeenAt === "number" ? relation.lastSeenAt : Date.now(),
                }))
                .filter(relation => relation.evidence && relation.candidate && relation.rejectedAt >= rejectedCutoff)
                .filter(relation => {
                    const key = `${relation.evidence.toLowerCase()}\n${relation.candidate.toLowerCase()}`;
                    if (rejectedRelationKeys.has(key)) return false;
                    rejectedRelationKeys.add(key);
                    return true;
                })
                .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
                .slice(0, this.settings.learnedVaultRelationCacheLimit * 2)
            : [];
        this.rebuildVaultRelationshipIndexes();

        this.settings.parallelWorkers = this.clampSetting(
            this.settings.parallelWorkers,
            DEFAULT_SETTINGS.parallelWorkers,
            1,
            16
        );
        this.settings.queueBatchMaxWaitMs = this.clampSetting(
            this.settings.queueBatchMaxWaitMs,
            DEFAULT_SETTINGS.queueBatchMaxWaitMs,
            1000,
            60000
        );
        this.settings.companionNoteCreationRetries = this.clampSetting(
            this.settings.companionNoteCreationRetries,
            DEFAULT_SETTINGS.companionNoteCreationRetries,
            0,
            5
        );
        this.settings.retryInitialWaitSeconds = this.clampSetting(
            this.settings.retryInitialWaitSeconds,
            DEFAULT_SETTINGS.retryInitialWaitSeconds,
            1,
            30
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
        this.settings.removeFolderTagsFromAiTags = this.settings.removeFolderTagsFromAiTags !== false;
        this.settings.removeGeolocationFromAiTags = this.settings.removeGeolocationFromAiTags !== false;
        this.settings.aiTagsUseAsVaultCandidate = this.settings.aiTagsUseAsVaultCandidate !== false;
        this.settings.aiDescriptionPropertyName = this.normalizePropertyName(this.settings.aiDescriptionPropertyName, DEFAULT_SETTINGS.aiDescriptionPropertyName);
        const hasMergedGeolocationAiSetting = !!loadedSettings
            && Object.prototype.hasOwnProperty.call(loadedSettings, "useGeolocationForAiTags");
        const useGeolocationForAi = hasMergedGeolocationAiSetting
            ? this.settings.useGeolocationForAiTags !== false
            : this.settings.useGeolocationForAiDescription !== false;
        this.settings.useGeolocationForAiDescription = useGeolocationForAi;
        this.settings.useGeolocationForAiTags = useGeolocationForAi;
        this.settings.imageAnalysisEnabled = this.settings.aiDescriptionPropertyEnabled;
        this.settings.ollamaVisionModel = typeof this.settings.ollamaVisionModel === "string" && this.settings.ollamaVisionModel.trim()
            ? this.settings.ollamaVisionModel.trim()
            : DEFAULT_SETTINGS.ollamaVisionModel;
        this.settings.ollamaVisionPrompt = typeof this.settings.ollamaVisionPrompt === "string" && this.settings.ollamaVisionPrompt.trim()
            ? this.settings.ollamaVisionPrompt.trim()
            : DEFAULT_SETTINGS.ollamaVisionPrompt;
        this.settings.aiDescriptionMinimumWords = this.clampSetting(
            this.settings.aiDescriptionMinimumWords,
            DEFAULT_SETTINGS.aiDescriptionMinimumWords,
            20,
            500
        );
        this.settings.bridgeRules = typeof this.settings.bridgeRules === "string" ? this.settings.bridgeRules : DEFAULT_SETTINGS.bridgeRules;
        const parsedOllamaTagsCap = Number(this.settings.ollamaGeneratedTagsCap);
        this.settings.ollamaGeneratedTagsCap = Number.isFinite(parsedOllamaTagsCap) && parsedOllamaTagsCap >= 0
            ? Math.round(parsedOllamaTagsCap)
            : DEFAULT_SETTINGS.ollamaGeneratedTagsCap;
        delete (this.settings as any).vocabularyCandidateProperties;
        this.settingsProfileSnapshot = this.serializeSettingsProfileSettings(this.settings);
    }

    async saveSettings() {
        this.invalidateExpensiveHealthCounts();
        const saveOperation = this.settingsSaveChain
            .catch(error => console.warn("Autotag recovered from an earlier settings save failure", error))
            .then(async () => {
                await this.syncActiveSettingsProfileBeforeSave();
                await this.saveData(this.settings);
            });
        this.settingsSaveChain = saveOperation;
        await saveOperation;
    }
}


class DuplicateDecisionModal extends Modal {
    constructor(
        app: App,
        private readonly plugin: AutotagPlugin,
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

        const image = this.plugin.getVaultFileByPathFlexible(imagePath);
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
        const image = this.plugin.getVaultFileByPathFlexible(imagePath);
        const note = this.plugin.getVaultFileByPathFlexible(notePath);
        const failedFile = this.plugin.getFailedFile(imagePath);
        const protectedJob = this.plugin.getProtectedJob(imagePath);
        const duplicateRecord = this.plugin.getDuplicateRecords().find(record =>
            this.plugin.areVaultPathsSame(record.filePath, imagePath)
            || this.plugin.areVaultPathsSame(record.notePath, notePath)
        );
        const activelyProcessing = this.plugin.isPathActivelyProcessing(imagePath) || this.plugin.isPathActivelyProcessing(notePath);
        const pendingAction = role === "new" && this.runId ? this.plugin.pendingDuplicateActions.get(this.runId) : null;

        if (!(image instanceof TFile)) return { label: "Image missing", tone: "danger" };
        if (!(note instanceof TFile)) return { label: "Waiting for companion note", tone: "warning", spinner: activelyProcessing };
        if (role === "existing" && (this.plugin.settings.processedFiles.some(processedPath => this.plugin.areVaultPathsSame(processedPath, imagePath)) || duplicateRecord)) {
            return { label: "Processed", tone: "success" };
        }
        if (role === "new" && pendingAction?.processingComplete) return { label: "Processed", tone: "success" };
        if (role === "new" && protectedJob?.stage === "waiting-duplicate-choice") return { label: "Processed", tone: "success" };
        if (role === "new" && protectedJob?.stage === "duplicate-decision" && this.plugin.settings.waitForDuplicateSourceProcessing) return { label: "Waiting for decision", tone: "warning" };
        if (activelyProcessing) return { label: "Processing", tone: "accent", spinner: true };
        if (failedFile) return { label: `Failed after ${failedFile.attempts} attempt${failedFile.attempts === 1 ? "" : "s"}`, tone: "danger" };
        if (this.plugin.settings.processedFiles.some(processedPath => this.plugin.areVaultPathsSame(processedPath, imagePath))) return { label: "Processed", tone: "success" };
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
            const spinnerEl = statusEl.createSpan({ cls: "autotag-duplicate-status-spinner" });
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
            ? "This file has the same exact content hash as an already processed image. Compare both sides before choosing how Autotag should continue."
            : `This file looks visually similar to an already processed image (${this.match.similarity ?? "unknown"}% similarity). Compare both sides before choosing how Autotag should continue.`;
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
            const statusWrap = card.createDiv({ cls: "autotag-duplicate-processing-status-wrap" });
            statusWrap.createSpan({ text: "Status: ", cls: "autotag-duplicate-processing-status-label" });
            const statusEl = statusWrap.createSpan({ cls: "autotag-duplicate-processing-status" });
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
                const currentImageFile = this.plugin.getVaultFileByPathFlexible(currentImagePath);
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
                const initialNote = this.plugin.getVaultFileByPathFlexible(initialPaths.notePath);
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
                const refreshedNote = this.plugin.getVaultFileByPathFlexible(currentPaths.notePath);
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
            new Notice("Choose a duplicate action before Autotag can continue.");
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
            text: `This removes the '${this.propertyName}' folder mapping from Autotag settings. Existing generated notes are not changed.`,
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
    private resolved = false;

    constructor(
        app: App,
        private readonly title: string,
        private readonly body: string,
        private readonly confirmText: string,
        private readonly onConfirm: () => void | Promise<void>,
        private readonly onCancel?: () => void | Promise<void>
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: this.title });
        contentEl.createEl("p", { text: this.body });

        const actionSetting = new Setting(contentEl);
        actionSetting
            .addButton(button => button
                .setButtonText("Cancel")
                .onClick(() => {
                    void this.resolve(false);
                }))
            .addButton(button => button
                .setButtonText(this.confirmText)
                .setWarning()
                .onClick(() => {
                    void this.resolve(true);
                }));
    }

    private async resolve(confirmed: boolean): Promise<void> {
        if (this.resolved) return;
        this.resolved = true;
        try {
            if (confirmed) {
                await this.onConfirm();
            } else {
                await this.onCancel?.();
            }
        } finally {
            this.close();
        }
    }

    onClose(): void {
        if (!this.resolved) {
            this.resolved = true;
            void this.onCancel?.();
        }
        this.contentEl.empty();
    }
}

class EditLearnedRelationshipModal extends Modal {
    constructor(
        app: App,
        private readonly plugin: AutotagPlugin,
        private readonly relation: LearnedVaultRelation,
        private readonly onSaved: () => void | Promise<void>
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "Edit learned relationship" });
        let evidence = this.relation.evidence;
        let candidate = this.relation.candidate;
        let relationType = this.relation.relationType;
        let confidence = this.relation.confidence;

        new Setting(contentEl)
            .setName("Evidence wording")
            .setDesc("The wording Autotag should recognize in future input.")
            .addText(text => text
                .setValue(evidence)
                .onChange(value => evidence = value));
        new Setting(contentEl)
            .setName("Vault value")
            .setDesc("The existing Vault Awareness value this evidence should resolve to.")
            .addText(text => text
                .setValue(candidate)
                .onChange(value => candidate = value));
        new Setting(contentEl)
            .setName("Relationship type")
            .addDropdown(dropdown => {
                const types = ["word-family", "synonym", "compound", "spelling", "acronym", "broader-narrower", "related"];
                if (!types.includes(relationType)) types.push(relationType);
                types.forEach(type => dropdown.addOption(type, type.replace(/-/g, " ")));
                dropdown.setValue(relationType).onChange(value => relationType = value);
            });
        const confidenceSetting = new Setting(contentEl)
            .setName("Confidence")
            .setDesc(`Values below the current ${this.plugin.settings.learnedVaultRelationMinimumConfidence}% retention threshold are discarded when saved.`);
        confidenceSetting.addSlider(slider => slider
            .setLimits(0, 100, 1)
            .setValue(confidence)
            .setDynamicTooltip()
            .onChange(value => {
                confidence = value;
                confidenceValueEl.setText(`${value}%`);
            }));
        const confidenceValueEl = confidenceSetting.controlEl.createEl("span", {
            text: `${confidence}%`,
            cls: "autotag-slider-value",
        });

        new Setting(contentEl)
            .addButton(button => button
                .setButtonText("Cancel")
                .onClick(() => this.close()))
            .addButton(button => button
                .setButtonText("Save")
                .setCta()
                .onClick(async () => {
                    const retained = await this.plugin.editLearnedVaultRelation(
                        this.relation.evidence,
                        this.relation.candidate,
                        { evidence, candidate, relationType, confidence }
                    );
                    await this.onSaved();
                    new Notice(retained
                        ? "Updated learned relationship."
                        : "The relationship was invalid or below the retention threshold and was discarded.");
                    this.close();
                }));
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

class LearnedRelationshipsReviewModal extends Modal {
    private query = "";
    private maximumConfidence = 100;
    private summaryEl: HTMLElement | null = null;
    private listEl: HTMLElement | null = null;

    constructor(
        app: App,
        private readonly plugin: AutotagPlugin,
        private readonly onChanged: () => void | Promise<void>
    ) {
        super(app);
    }

    onOpen(): void {
        const { contentEl, modalEl } = this;
        modalEl.addClass("autotag-relationship-review-modal");
        contentEl.empty();
        contentEl.createEl("h2", { text: "Review learned relationships" });
        contentEl.createEl("p", {
            text: "Search accepted mappings, surface uncertain entries by confidence, and manage each relationship without editing the generated operational file.",
            cls: "setting-item-description",
        });

        const filtersEl = contentEl.createDiv({ cls: "autotag-relationship-review-filters" });
        new Setting(filtersEl)
            .setName("Word search")
            .setDesc("Search the recognized wording or its related vault value.")
            .addText(text => text
                .setPlaceholder("Clouds, cloudy, panorama...")
                .onChange(value => {
                    this.query = value.trim().toLowerCase();
                    this.renderRelationships();
                }));
        const confidenceFilterSetting = new Setting(filtersEl)
            .setName("Confidence at or below")
            .setDesc("Lower this value to focus on relationships that may need review.");
        confidenceFilterSetting.addSlider(slider => slider
            .setLimits(0, 100, 1)
            .setValue(this.maximumConfidence)
            .setDynamicTooltip()
            .onChange(value => {
                this.maximumConfidence = value;
                confidenceFilterValueEl.setText(`${value}%`);
                this.renderRelationships();
            }));
        const confidenceFilterValueEl = confidenceFilterSetting.controlEl.createEl("span", {
            text: `${this.maximumConfidence}%`,
            cls: "autotag-slider-value",
        });

        this.summaryEl = contentEl.createEl("p", { cls: "setting-item-description autotag-relationship-review-summary" });
        this.listEl = contentEl.createDiv({ cls: "autotag-relationship-review-list" });
        this.renderRelationships();
    }

    private renderRelationships(): void {
        if (!this.summaryEl || !this.listEl) return;
        const allRelations = [...this.plugin.settings.learnedVaultRelations];
        const relations = allRelations
            .filter(relation => relation.confidence <= this.maximumConfidence)
            .filter(relation => {
                if (!this.query) return true;
                return [relation.evidence, relation.candidate]
                    .some(value => value.toLowerCase().includes(this.query));
            })
            .sort((a, b) => a.confidence - b.confidence || a.candidate.localeCompare(b.candidate));

        this.summaryEl.setText(`Showing ${relations.length} of ${allRelations.length} accepted relationship${allRelations.length === 1 ? "" : "s"}. Retention threshold: ${this.plugin.settings.learnedVaultRelationMinimumConfidence}%.`);
        this.listEl.empty();
        if (relations.length === 0) {
            this.listEl.createEl("p", {
                text: allRelations.length === 0 ? "No learned relationships are currently retained." : "No relationships match these filters.",
                cls: "setting-item-description",
            });
            return;
        }

        relations.forEach(relation => {
            const itemEl = this.listEl!.createDiv({ cls: "autotag-relationship-review-item" });
            const headingEl = itemEl.createDiv({ cls: "autotag-relationship-review-heading" });
            headingEl.createEl("strong", { text: `${relation.evidence} -> ${relation.candidate}` });
            const confidenceEl = headingEl.createEl("span", {
                text: `${relation.confidence}%`,
                cls: "autotag-relationship-confidence",
            });
            confidenceEl.addClass(relation.confidence >= 85
                ? "is-high"
                : relation.confidence >= this.plugin.settings.learnedVaultRelationMinimumConfidence ? "is-medium" : "is-low");
            if (relation.pinned) headingEl.createEl("span", { text: "Kept", cls: "autotag-relationship-kept" });
            const metadataEl = itemEl.createDiv({ cls: "autotag-relationship-review-metadata" });
            [
                relation.relationType.replace(/-/g, " "),
                `${relation.confirmations} confirmation${relation.confirmations === 1 ? "" : "s"}`,
                relation.model || "unknown model",
                `Last used ${new Date(relation.lastUsedAt || relation.lastConfirmedAt).toLocaleString()}`,
            ].forEach(value => metadataEl.createEl("span", { text: value }));

            new Setting(itemEl)
                .addButton(button => button
                    .setIcon("check")
                    .setTooltip(relation.pinned ? "Already kept" : "Keep and trust this relationship")
                    .setDisabled(relation.pinned)
                    .onClick(async () => {
                        await this.plugin.keepLearnedVaultRelation(relation.evidence, relation.candidate);
                        await this.onChanged();
                        this.renderRelationships();
                    }))
                .addButton(button => button
                    .setIcon("pencil")
                    .setTooltip("Edit relationship")
                    .onClick(() => new EditLearnedRelationshipModal(
                        this.app,
                        this.plugin,
                        { ...relation },
                        async () => {
                            await this.onChanged();
                            this.renderRelationships();
                        }
                    ).open()))
                .addButton(button => button
                    .setIcon("x")
                    .setTooltip("Reject for 30 days")
                    .onClick(async () => {
                        await this.plugin.rejectLearnedVaultRelation(relation.evidence, relation.candidate);
                        await this.onChanged();
                        this.renderRelationships();
                    }))
                .addButton(button => button
                    .setIcon("trash")
                    .setTooltip("Remove relationship")
                    .setWarning()
                    .onClick(async () => {
                        await this.plugin.removeLearnedVaultRelation(relation.evidence, relation.candidate);
                        await this.onChanged();
                        this.renderRelationships();
                    }));
        });
    }

    onClose(): void {
        this.contentEl.empty();
        this.modalEl.removeClass("autotag-relationship-review-modal");
    }
}

class LimitedFileTypeWarningModal extends Modal {
    constructor(
        app: App,
        private readonly plugin: AutotagPlugin,
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
        private readonly plugin: AutotagPlugin,
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
        const row = parent.createDiv({ cls: "autotag-manual-pair-meta-line" });
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
        const expectedNotePath = this.plugin.getCompanionNotePath(this.image);
        const noteContent = await this.plugin.getCompanionNoteContent(this.note.path);

        contentEl.createEl("h2", { text: "Confirm Manual Pairing" });
        contentEl.createEl("p", {
            text: this.willQueue
                ? "One of these files is currently queued or processing. If confirmed, Autotag will update the pair after processing finishes."
                : "Review the image and companion note before updating Autotag's pair database.",
            cls: "setting-item-description",
        });

        const previewRow = contentEl.createDiv({ cls: "autotag-manual-pair-preview-row" });

        const imageCard = previewRow.createDiv({ cls: "autotag-manual-pair-card autotag-manual-pair-card-source" });
        imageCard.createEl("h3", { text: "Image / Source File" });
        const imageWrap = imageCard.createDiv({ cls: "autotag-manual-pair-image-wrap" });
        const imageEl = imageWrap.createEl("img", {
            attr: {
                src: this.app.vault.getResourcePath(this.image),
                alt: this.image.path,
            },
        });
        const imageFallbackEl = imageWrap.createDiv({
            text: "Preview unavailable for this file type.",
            cls: "autotag-manual-pair-preview-fallback",
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

        const noteCard = previewRow.createDiv({ cls: "autotag-manual-pair-card autotag-manual-pair-card-note" });
        noteCard.createEl("h3", { text: "Companion Note" });
        this.createMetaLine(noteCard, "Path", this.note.path);
        this.createMetaLine(noteCard, "Current Pair ID", notePair?.pairId ?? "unpaired");
        this.createMetaLine(noteCard, "Matches expected path", this.note.path === expectedNotePath ? "yes" : "no");
        if (imagePair?.pairId && notePair?.pairId && imagePair.pairId !== notePair.pairId) {
            const warningEl = noteCard.createDiv({
                text: "Both files already belong to different pairs. Confirming will unpair their old partners and create one pair for these two files.",
                cls: "autotag-manual-pair-warning",
            });
            warningEl.setAttr("aria-label", "Pairing warning");
        }
        const notePreviewEl = noteCard.createEl("pre", {
            text: noteContent.trim()
                ? noteContent.slice(0, 1600) + (noteContent.length > 1600 ? "\n..." : "")
                : "Companion note is empty.",
            cls: "autotag-manual-pair-note-preview",
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

class AutotagSettingTab extends PluginSettingTab {
    plugin: AutotagPlugin;
    recentlyAddedPanelKeys = new Set<string>();
    infoScrollCloseHandlers: { target: EventTarget; handler: EventListener }[] = [];

    constructor(app: App, plugin: AutotagPlugin) {
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
            el.addClass("autotag-newly-added-panel");
        }
    }

    closeInfoDescriptions(containerEl: HTMLElement = this.containerEl): void {
        const controllers = Array.from(containerEl.querySelectorAll(".setting-item"))
            .map(el => (el as any).__autotagInfoController)
            .filter(Boolean);
        controllers.forEach(controller => controller.close());
    }

    resetInfoScrollCloseHandlers(): void {
        this.infoScrollCloseHandlers.forEach(({ target, handler }) => target.removeEventListener("scroll", handler));
        this.infoScrollCloseHandlers = [];
    }

    registerInfoCloseGuards(containerEl: HTMLElement): void {
        if ((containerEl as any).__autotagInfoCloseGuardsAttached) return;
        (containerEl as any).__autotagInfoCloseGuardsAttached = true;
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

    dedupePropertyNames(properties: string[]): string[] {
        return Array.from(new Set(properties.map(property => property.trim()).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b));
    }

    attachTextSuggestions(inputEl: HTMLInputElement, suggestions: string[]): void {
        const uniqueSuggestions = this.dedupePropertyNames(suggestions)
            .sort((a, b) => a.localeCompare(b));
        if (uniqueSuggestions.length === 0) return;

        const anchorEl = inputEl.parentElement;
        if (!anchorEl) return;
        const menuId = `autotag-suggestions-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        inputEl.removeAttribute("list");
        anchorEl.addClass("autotag-suggestion-anchor");
        const menuEl = anchorEl.createDiv({ cls: "autotag-suggestion-menu" });
        menuEl.id = menuId;
        menuEl.setAttr("role", "listbox");
        menuEl.style.display = "none";
        let visibleSuggestions: string[] = [];
        let activeIndex = -1;

        const closeSuggestions = () => {
            menuEl.style.display = "none";
            menuEl.removeClass("is-open");
            menuEl.empty();
            visibleSuggestions = [];
            activeIndex = -1;
            anchorEl.removeClass("has-open-suggestions");
            inputEl.setAttribute("aria-expanded", "false");
            inputEl.removeAttribute("aria-activedescendant");
        };
        const positionSuggestions = () => {
            const anchorRect = anchorEl.getBoundingClientRect();
            const inputRect = inputEl.getBoundingClientRect();
            menuEl.style.left = `${inputRect.left - anchorRect.left + anchorEl.scrollLeft}px`;
            menuEl.style.top = `${inputRect.bottom - anchorRect.top + anchorEl.scrollTop + 4}px`;
            menuEl.style.width = `${inputRect.width}px`;
        };
        const setActiveSuggestion = (index: number) => {
            const options = Array.from(menuEl.querySelectorAll<HTMLElement>(".autotag-suggestion-option"));
            if (options.length === 0) {
                activeIndex = -1;
                return;
            }
            activeIndex = Math.max(0, Math.min(index, options.length - 1));
            options.forEach((optionEl, optionIndex) => {
                const active = optionIndex === activeIndex;
                optionEl.toggleClass("is-active", active);
                optionEl.setAttr("aria-selected", active ? "true" : "false");
            });
            const activeOption = options[activeIndex];
            inputEl.setAttribute("aria-activedescendant", activeOption.id);
            activeOption.scrollIntoView({ block: "nearest" });
        };
        const selectSuggestion = (suggestion: string) => {
            inputEl.value = suggestion;
            inputEl.dispatchEvent(new Event("input", { bubbles: true }));
            inputEl.dispatchEvent(new Event("change", { bubbles: true }));
            closeSuggestions();
            inputEl.focus();
        };
        const refreshSuggestions = () => {
            const query = inputEl.value.trim().toLowerCase().replace(/\\/g, "/");
            visibleSuggestions = query
                ? uniqueSuggestions
                .filter(suggestion => suggestion.toLowerCase().replace(/\\/g, "/").includes(query))
                .slice(0, 50)
                : [];
            menuEl.empty();
            activeIndex = -1;
            if (visibleSuggestions.length === 0) {
                closeSuggestions();
                return;
            }

            document.querySelectorAll<HTMLElement>(".autotag-suggestion-menu.is-open")
                .forEach(openMenuEl => {
                    if (openMenuEl === menuEl) return;
                    openMenuEl.style.display = "none";
                    openMenuEl.removeClass("is-open");
                    openMenuEl.parentElement?.removeClass("has-open-suggestions");
                });
            visibleSuggestions.forEach((suggestion, index) => {
                const optionEl = menuEl.createEl("button", {
                    text: suggestion,
                    cls: "autotag-suggestion-option",
                    attr: {
                        id: `${menuId}-${index}`,
                        type: "button",
                        role: "option",
                        "aria-selected": "false",
                    },
                });
                optionEl.addEventListener("mouseenter", () => setActiveSuggestion(index));
                optionEl.addEventListener("mousedown", event => {
                    event.preventDefault();
                    selectSuggestion(suggestion);
                });
            });
            positionSuggestions();
            menuEl.style.display = "block";
            menuEl.addClass("is-open");
            anchorEl.addClass("has-open-suggestions");
            inputEl.setAttribute("aria-expanded", "true");
        };
        inputEl.setAttribute("autocomplete", "off");
        inputEl.setAttribute("aria-autocomplete", "list");
        inputEl.setAttribute("aria-controls", menuId);
        inputEl.setAttribute("aria-expanded", "false");
        inputEl.addEventListener("input", refreshSuggestions);
        inputEl.addEventListener("focus", refreshSuggestions);
        inputEl.addEventListener("keydown", event => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                if (menuEl.style.display === "none") refreshSuggestions();
                if (visibleSuggestions.length === 0) return;
                event.preventDefault();
                const direction = event.key === "ArrowDown" ? 1 : -1;
                const nextIndex = activeIndex < 0
                    ? (direction > 0 ? 0 : visibleSuggestions.length - 1)
                    : (activeIndex + direction + visibleSuggestions.length) % visibleSuggestions.length;
                setActiveSuggestion(nextIndex);
                return;
            }
            if (event.key === "Enter" && activeIndex >= 0 && visibleSuggestions[activeIndex]) {
                event.preventDefault();
                selectSuggestion(visibleSuggestions[activeIndex]);
                return;
            }
            if (event.key === "Escape") closeSuggestions();
        });
        inputEl.addEventListener("blur", () => {
            window.setTimeout(closeSuggestions, 0);
        });
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

    getObsidianUsedPropertyNames(): string[] {
        return this.getAllFrontmatterProperties();
    }

    getConfiguredPluginPropertyNames(): string[] {
        const properties = new Set<string>();
        const add = (property: string | undefined | null) => {
            const normalized = property?.trim();
            if (normalized) properties.add(normalized);
        };

        if (this.plugin.settings.useFolderTags) {
            this.plugin.getFolderPropertyMappings().forEach(mapping => add(mapping.property));
            add(this.plugin.settings.folderFallbackProperty);
        }
        if (this.plugin.settings.linkToFilePropertyEnabled) add(this.plugin.getLinkToFilePropertyName());
        if (this.plugin.settings.fileTypePropertyEnabled) add(this.plugin.getFileTypePropertyName());
        if (this.plugin.settings.embedPropertyEnabled) add(this.plugin.getEmbedPropertyName());
        if (this.plugin.settings.aiTagsPropertyEnabled) add(this.plugin.getAiTagsPropertyName());
        if (this.plugin.settings.aiDescriptionPropertyEnabled) add(this.plugin.getAiDescriptionPropertyName());
        if (this.plugin.settings.vaultAwarenessOutputEnabled) add(this.plugin.getVaultAwarenessOutputPropertyName());
        if (this.plugin.settings.geolocationEnabled) this.plugin.getGeolocationPropertyNames().forEach(add);

        return this.dedupePropertyNames(Array.from(properties));
    }

    getPropertyNameSuggestions(detectedProperties: string[] = this.getDetectedFrontmatterProperties()): string[] {
        return this.dedupePropertyNames([
            ...this.getConfiguredPluginPropertyNames(),
            ...this.plugin.parseFrontmatterTemplateProperties(this.plugin.getFrontmatterPreviewTemplateText()),
            ...detectedProperties,
        ]);
    }

    getPropertyConfigurationLocations(property: string): { label: string; sectionId: string; anchorId: string }[] {
        const target = property.trim();
        const locations: { label: string; sectionId: string; anchorId: string }[] = [];
        const add = (candidate: string, label: string, sectionId: string, anchorId: string) => {
            if (candidate.trim() === target) locations.push({ label, sectionId, anchorId });
        };

        if (this.plugin.settings.linkToFilePropertyEnabled) {
            add(this.plugin.getLinkToFilePropertyName(), "Properties > Link to file", "properties", "autotag-property-link-to-file");
        }
        if (this.plugin.settings.fileTypePropertyEnabled) {
            add(this.plugin.getFileTypePropertyName(), "Properties > File type", "properties", "autotag-property-file-type");
        }
        if (this.plugin.settings.embedPropertyEnabled) {
            add(this.plugin.getEmbedPropertyName(), "Properties > Embed", "properties", "autotag-property-embed");
        }

        if (this.plugin.settings.useFolderTags) {
            this.plugin.getFolderPropertyMappings().forEach((mapping, index) => {
                add(
                    this.plugin.normalizeFolderFallbackProperty(mapping.property),
                    `Folder Tags > Property ${index + 1}`,
                    "folder-tags",
                    `autotag-folder-property-${mapping.id}`
                );
            });
            add(
                this.plugin.normalizeFolderFallbackProperty(this.plugin.settings.folderFallbackProperty),
                "Folder Tags > Fallback",
                "folder-tags",
                "autotag-folder-fallback-property"
            );
        }

        if (this.plugin.settings.geolocationEnabled) {
            this.plugin.getGeolocationProperties().forEach((mapping, index) => {
                add(
                    this.plugin.normalizePropertyName(mapping.property, this.plugin.getDefaultGeolocationPropertyName(mapping.field)),
                    `Geolocation Tags > Property ${index + 1}`,
                    "geolocation",
                    `autotag-geolocation-property-${mapping.id}`
                );
            });
        }

        if ((this.plugin.settings.aiTaggingEnabled || this.plugin.canRunDirectBridgeOutput()) && this.plugin.settings.aiTagsPropertyEnabled) {
            add(this.plugin.getAiTagsPropertyName(), "AI Tags > Generated tags", "ai-tags", "autotag-ai-tags-property");
        }
        if (this.plugin.settings.aiDescriptionPropertyEnabled) {
            add(this.plugin.getAiDescriptionPropertyName(), "AI Tags > Image description", "ai-tags", "autotag-ai-description-property");
        }
        if (this.plugin.settings.aiTaggingEnabled && this.plugin.settings.vaultAwarenessEnabled && this.plugin.settings.vaultAwarenessOutputEnabled) {
            add(
                this.plugin.getVaultAwarenessOutputPropertyName(),
                "Vault Awareness > Output",
                "vault-awareness",
                "autotag-vault-awareness-output-property"
            );
        }

        return locations;
    }

    getDetectedFrontmatterProperties(): string[] {
        return this.dedupePropertyNames(this.getObsidianUsedPropertyNames());
    }

    renderLimitedFileTypeWarningSettings(containerEl: HTMLElement): void {
        const warningPanelEl = containerEl.createDiv({ cls: "autotag-property-panel" });
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
            const controlsEl = this.createSettingsRevealContainer(warningControlsHostEl, "autotag-subcategory");
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
            const propertyPanelEl = containerEl.createDiv({ cls: "autotag-property-panel" });
            propertyPanelEl.id = `autotag-folder-property-${mapping.id}`;
            this.applyRecentlyAddedPanelHighlight(propertyPanelEl, "folder-property", mapping.id);
            propertyPanelEl.createEl("h5", { text: `Folder Property ${index + 1}` });

            let renderValuesSetting: () => void = () => undefined;
            const updateMappingProperty = async (value: string) => {
                if (mapping.valueSource === "manual") {
                    this.plugin.rememberFolderPropertyManualValues(mapping.property, mapping.values);
                }
                mapping.property = this.plugin.normalizeFolderFallbackProperty(value);
                if (mapping.valueSource === "automatic") {
                    this.plugin.syncAutomaticFolderPropertyMapping(mapping, true);
                } else {
                    mapping.values = this.plugin.getRememberedFolderPropertyManualValues(mapping.property) ?? [];
                }
                await this.plugin.saveSettings();
                if (mapping.useAsVaultCandidate) this.plugin.scheduleVaultVocabularyCacheBuild();
                renderValuesSetting();
            };
            const setting = new Setting(propertyPanelEl)
                .setName("Property")
                .setDesc("Type any frontmatter property name or choose a searchable suggestion from the active template, detected vault properties, and plugin properties.");

            let propertyUpdateTimer: number | null = null;
            setting.addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getPropertyNameSuggestions(detectedProperties));
                text.setPlaceholder(DEFAULT_SETTINGS.folderFallbackProperty)
                    .setValue(mapping.property)
                    .onChange(value => {
                        if (propertyUpdateTimer !== null) window.clearTimeout(propertyUpdateTimer);
                        propertyUpdateTimer = window.setTimeout(() => {
                            propertyUpdateTimer = null;
                            void updateMappingProperty(value);
                        }, 250);
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

            new Setting(propertyPanelEl)
                .setName("Value source")
                .setDesc("Manual uses the comma-separated list below. Automatic keeps this list updated from existing Obsidian values for the selected property; new values are added when Obsidian updates a changed note, without background polling.")
                .addDropdown(dropdown => dropdown
                    .addOption("manual", "Manual")
                    .addOption("automatic", "Automatic")
                    .setValue(mapping.valueSource ?? "manual")
                    .onChange(async value => {
                        const nextSource: FolderPropertyValueSource = value === "automatic" ? "automatic" : "manual";
                        if (mapping.valueSource === nextSource) return;
                        if (mapping.valueSource === "manual") {
                            this.plugin.rememberFolderPropertyManualValues(mapping.property, mapping.values);
                        }
                        mapping.valueSource = nextSource;
                        if (mapping.valueSource === "automatic") {
                            this.plugin.syncAutomaticFolderPropertyMapping(mapping, true);
                        } else {
                            mapping.values = this.plugin.getRememberedFolderPropertyManualValues(mapping.property) ?? [];
                        }
                        await this.plugin.saveSettings();
                        renderValuesSetting();
                    }));

            const valuesHostEl = propertyPanelEl.createDiv();
            renderValuesSetting = () => {
                valuesHostEl.empty();
                const valuesSetting = new Setting(valuesHostEl)
                    .setName(mapping.valueSource === "automatic" ? "Automatic values" : "Manual values")
                    .setDesc(mapping.valueSource === "automatic"
                        ? `Saved from Obsidian values for '${mapping.property}'. Current count: ${mapping.values.length}. New values are added when Obsidian reports a changed note.`
                        : "Folder names that should be written to this property, separated by commas.");
                valuesSetting.settingEl.addClass("autotag-folder-values-setting");
                if (mapping.valueSource === "automatic") {
                    const pillsEl = valuesSetting.controlEl.createDiv({ cls: "autotag-auto-values-pills" });
                    if (mapping.values.length === 0) {
                        pillsEl.createSpan({
                            text: "No values detected yet",
                            cls: "autotag-auto-values-empty",
                        });
                    } else {
                        mapping.values.forEach(value => pillsEl.createSpan({
                            text: value,
                            cls: "autotag-auto-value-pill",
                        }));
                    }
                } else {
                    valuesSetting.addTextArea(textArea => {
                        textArea.inputEl.rows = 2;
                        textArea
                            .setPlaceholder("comma, separated")
                            .setValue(mapping.values.join(", "))
                            .onChange(async value => {
                                mapping.values = this.plugin.parseManualFolderPropertyValueInput(value);
                                this.plugin.rememberFolderPropertyManualValues(mapping.property, mapping.values);
                                await this.plugin.saveSettings();
                            });
                    });
                }
                this.enhanceInfoDescriptionAnimations(valuesHostEl);
            };
            renderValuesSetting();

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

            let mappingAiWarningHostEl: HTMLElement | null = null;
            const renderMappingAiWarning = () => {
                if (!mappingAiWarningHostEl) return;
                mappingAiWarningHostEl.empty();
                const mode = this.plugin.getFolderMappingAiCandidateMode(mapping);
                this.renderInlineDependencyWarning(
                    mappingAiWarningHostEl,
                    "AI Tagging is off",
                    this.plugin.isCandidateSourceActive(mode) && !this.plugin.settings.aiTaggingEnabled
                        ? ["This folder property is set to feed AI Tags, but AI Tagging is currently disabled. Enable AI Tags or set this mode to Disabled."]
                        : [],
                    this.getSettingsSectionIcon("ai-tags")
                );
            };
            this.setSettingNameWithIcon(
                this.addCandidateModeDropdown(
                    new Setting(propertyPanelEl)
                        .setDesc("Controls how values generated by this folder property can influence AI Tags. All Keywords lets the value act as metadata evidence, Consider uses it only as a weak clue, Exclude keeps exact values out of AI Tags, and Disabled ignores it for AI."),
                    this.plugin.getFolderMappingAiCandidateMode(mapping),
                    async value => {
                        mapping.aiCandidateMode = value;
                        mapping.useAsAiCandidate = this.plugin.isCandidateSourceActive(value);
                        await this.plugin.saveSettings();
                        this.animateInlineDependencyWarning(mappingAiWarningHostEl!, renderMappingAiWarning);
                    }
                ),
                "AI candidate mode",
                this.getSettingsSectionIcon("ai-tags")
            );
            mappingAiWarningHostEl = propertyPanelEl.createDiv();
            renderMappingAiWarning();

            let mappingVaultWarningHostEl: HTMLElement | null = null;
            const renderMappingVaultWarning = () => {
                if (!mappingVaultWarningHostEl) return;
                mappingVaultWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    mappingVaultWarningHostEl,
                    "Advanced vocabulary source",
                    this.getVaultVocabularyAdvancedWarningLines(
                        mapping.useAsVaultCandidate,
                        this.plugin.settings.vaultAwarenessEnabled,
                        "property"
                    ),
                    this.getSettingsSectionIcon("vault-awareness")
                );
            };
            mappingVaultWarningHostEl = propertyPanelEl.createDiv();
            renderMappingVaultWarning();
            this.setSettingNameWithIcon(
                new Setting(propertyPanelEl)
                    .setDesc("Scans this property across the whole vault. Every existing frontmatter value found there can become known vocabulary for Vault Awareness, not only values from the file currently being processed.")
                    .addToggle(toggle => toggle
                        .setValue(mapping.useAsVaultCandidate)
                        .onChange(async value => {
                            mapping.useAsVaultCandidate = value;
                            await this.plugin.saveSettings();
                            this.plugin.scheduleVaultVocabularyCacheBuild();
                            this.animateInlineDependencyWarning(mappingVaultWarningHostEl!, renderMappingVaultWarning);
                        })),
                "Use property as Vault Awareness vocabulary",
                this.getSettingsSectionIcon("vault-awareness")
            );
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
                        valueSource: 'manual',
                        format: '',
                        aiCandidateMode: 'all',
                        useAsAiCandidate: true,
                        useAsVaultCandidate: false,
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
        const bodyEl = this.createSettingsRevealContainer(containerEl, "autotag-subcategory");
        this.addLinguisticFeatureToggles(bodyEl, scope);
    }

    createSettingsRevealContainer(containerEl: HTMLElement, extraClass = ""): HTMLElement {
        const classes = ["autotag-animated-section-body", "is-open", ...extraClass.split(/\s+/).filter(Boolean)];
        return containerEl.createDiv({ cls: classes.join(" ") });
    }

    createSettingsSubcategory(containerEl: HTMLElement): HTMLElement {
        return containerEl.createDiv();
    }
    renderFormatPreview(containerEl: HTMLElement, label: string, format: string | undefined, hintMode: "visible" | "info" = "visible"): void {
        containerEl.empty();
        const hintText = "Use example, Example, or EXAMPLE to control casing; empty writes plain values.";
        const previewEl = containerEl.createDiv({ cls: "autotag-format-preview" });
        previewEl.createEl("span", { text: `${label}: `, cls: "autotag-format-preview-label" });
        if (hintMode === "info") {
            const infoWrap = previewEl.createSpan({ cls: "autotag-format-preview-info-wrap" });
            infoWrap.createSpan({ cls: "autotag-info-trigger", text: "i" });
            infoWrap.createSpan({ cls: "autotag-format-preview-info", text: hintText });
        }
        const markdownEl = previewEl.createDiv({ cls: "autotag-format-preview-markdown" });
        const previewValue = this.plugin.getFormatPreview(format);
        if (/^\[\[[^\[\]]+\]\]$/.test(previewValue)) {
            void MarkdownRenderer.render(this.app, previewValue, markdownEl, "", this.plugin);
        } else {
            markdownEl.setText(previewValue);
        }
        if (hintMode === "visible") {
            containerEl.createDiv({
                text: hintText,
                cls: "autotag-format-preview-hint",
            });
        }
    }

    getTemplatePropertySuggestionRefs(containerEl: HTMLElement): TemplatePropertySuggestionRefs {
        const existing = (containerEl as any).__autotagTemplatePropertySuggestion as TemplatePropertySuggestionRefs | undefined;
        if (existing) return existing;

        containerEl.empty();
        const panelEl = containerEl.createDiv({ cls: "autotag-frontmatter-check-panel is-clean autotag-template-suggestion-panel" });
        panelEl.id = "autotag-properties-template-suggestions-warning";
        const infoSettingEl = panelEl.createDiv({ cls: "setting-item autotag-frontmatter-check-info-setting" });
        const infoBodyEl = infoSettingEl.createDiv({ cls: "setting-item-info" });
        const nameEl = infoBodyEl.createDiv({ cls: "setting-item-name" });
        const titleTextEl = nameEl.createSpan();
        infoBodyEl.createDiv({
            text: "These are active Autotag output properties that can be placed in the selected template source. If you leave them undeclared, Autotag can still add them later.",
            cls: "setting-item-description",
        });
        const controlEl = infoSettingEl.createDiv({ cls: "setting-item-control" });
        const copyButtonEl = controlEl.createEl("button", { text: "Copy Properties" });
        copyButtonEl.type = "button";
        const listEl = panelEl.createEl("ul", { cls: "autotag-frontmatter-check-list" });
        const cleanTextEl = panelEl.createEl("p", {
            cls: "setting-item-description autotag-frontmatter-check-clean-text",
        });
        this.enhanceInfoDescriptionAnimations(panelEl);

        const refs: TemplatePropertySuggestionRefs = {
            panelEl,
            titleTextEl,
            listEl,
            cleanTextEl,
            copyButtonEl,
        };
        (containerEl as any).__autotagTemplatePropertySuggestion = refs;
        return refs;
    }

    renderTemplatePropertySuggestionBox(containerEl: HTMLElement, animate = false): void {
        const refs = this.getTemplatePropertySuggestionRefs(containerEl);
        const templateAvailable = this.plugin.isTemplateSourceAvailable();
        containerEl.style.display = templateAvailable ? "" : "none";
        if (!templateAvailable) return;

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
            refs.copyButtonEl.style.display = hasMissingProperties ? "" : "none";
            refs.copyButtonEl.onclick = async () => {
                const text = missingProperties.map(property => `${property}:`).join("\n");
                if (!text) {
                    new Notice("No undeclared properties to copy.");
                    return;
                }
                await navigator.clipboard.writeText(text);
                new Notice(`Copied ${missingProperties.length} undeclared propert${missingProperties.length === 1 ? "y" : "ies"}.`);
            };
            missingProperties.forEach(property => {
                const itemEl = refs.listEl.createEl("li");
                itemEl.createSpan({ text: `${property}:` });
                const locations = this.getPropertyConfigurationLocations(property);
                locations.forEach((location, index) => {
                    itemEl.createSpan({ text: index === 0 ? " " : ", " });
                    const locationButtonEl = itemEl.createEl("button", {
                        text: `(${location.label})`,
                        cls: "autotag-property-location-link",
                    });
                    locationButtonEl.type = "button";
                    locationButtonEl.setAttr("aria-label", `Open ${location.label}`);
                    locationButtonEl.addEventListener("click", () => {
                        this.openSettingsProblemTarget(location.sectionId, location.anchorId);
                    });
                });
            });
        };

        if (animate) {
            this.animateElementHeightChange(refs.panelEl, updatePanel, 360);
        } else {
            updatePanel();
        }
    }

    getGeneratedMarkdownPreviewRefs(containerEl: HTMLElement): GeneratedMarkdownPreviewRefs {
        const existing = (containerEl as any).__autotagGeneratedMarkdownPreview as GeneratedMarkdownPreviewRefs | undefined;
        if (existing) return existing;

        containerEl.empty();
        const checkPanelEl = containerEl.createDiv({ cls: "autotag-frontmatter-check-panel is-clean" });
        checkPanelEl.id = "autotag-properties-template-check-warning";
        const infoSettingEl = checkPanelEl.createDiv({ cls: "setting-item autotag-frontmatter-check-info-setting" });
        const infoBodyEl = infoSettingEl.createDiv({ cls: "setting-item-info" });
        const nameEl = infoBodyEl.createDiv({ cls: "setting-item-name" });
        const titleTextEl = nameEl.createSpan();
        infoBodyEl.createDiv({
            text: "Reasons may be: Spelling, or your intended purpose.",
            cls: "setting-item-description",
        });
        const listEl = checkPanelEl.createEl("ul", { cls: "autotag-frontmatter-check-list" });
        const cleanTextEl = checkPanelEl.createEl("p", {
            cls: "setting-item-description autotag-frontmatter-check-clean-text",
        });
        this.enhanceInfoDescriptionAnimations(checkPanelEl);

        const embedSettingHostEl = containerEl.createDiv({ cls: "autotag-image-embed-setting-host" });
        const previewPanelEl = containerEl.createDiv({ cls: "autotag-property-panel autotag-markdown-note-preview-panel" });
        previewPanelEl.createEl("h5", { text: "Generated Markdown Preview" });
        previewPanelEl.createEl("p", {
            text: "Raw preview of the companion note after Autotag has applied the selected template source, generated properties, folder properties, geolocation properties, and note body setting.",
            cls: "setting-item-description",
        });
        const preEl = previewPanelEl.createEl("pre", { cls: "autotag-markdown-note-preview" });
        const codeEl = preEl.createEl("code");

        const refs: GeneratedMarkdownPreviewRefs = {
            checkPanelEl,
            titleTextEl,
            listEl,
            cleanTextEl,
            embedSettingHostEl,
            previewPanelEl,
            codeEl,
        };
        (containerEl as any).__autotagGeneratedMarkdownPreview = refs;
        return refs;
    }

    renderGeneratedMarkdownPreview(containerEl: HTMLElement, animate = false): void {
        const refs = this.getGeneratedMarkdownPreviewRefs(containerEl);
        this.updateGeneratedMarkdownPreview(refs, animate);
    }

    updateGeneratedMarkdownPreview(refs: GeneratedMarkdownPreviewRefs, animate: boolean): void {
        const templateAvailable = this.plugin.isTemplateSourceAvailable();
        refs.checkPanelEl.style.display = templateAvailable ? "" : "none";
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
            refs.cleanTextEl.setText("Empty template fields currently match enabled Autotag outputs.");
            unfilledProperties.forEach(property => refs.listEl.createEl("li", { text: property }));
        };

        if (templateAvailable && animate) {
            this.animateElementHeightChange(refs.checkPanelEl, updateCheckPanel, 360);
        } else if (templateAvailable) {
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
        const revealEls = Array.from(containerEl.querySelectorAll(".autotag-animated-section-body")) as HTMLElement[];
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
        const runningFrame = (element as any).__autotagHeightFrame as number | undefined;
        if (runningFrame !== undefined) window.cancelAnimationFrame(runningFrame);

        element.style.height = `${fromHeight}px`;
        element.style.overflow = "hidden";
        update();

        const toHeight = this.measureNaturalSettingsHeight(element, element.scrollHeight);
        if (Math.abs(toHeight - fromHeight) < 1) {
            element.style.height = "";
            element.style.overflow = "";
            (element as any).__autotagHeightFrame = undefined;
            return;
        }

        const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        (element as any).__autotagHeightToken = token;
        const start = performance.now();
        const tick = (now: number) => {
            if ((element as any).__autotagHeightToken !== token) return;
            const progress = Math.min(1, (now - start) / duration);
            const eased = this.easeSettingsAnimation(progress);
            element.style.height = `${fromHeight + (toHeight - fromHeight) * eased}px`;
            if (progress < 1) {
                (element as any).__autotagHeightFrame = window.requestAnimationFrame(tick);
                return;
            }
            (element as any).__autotagHeightFrame = undefined;
            (element as any).__autotagHeightToken = undefined;
            element.style.height = "";
            element.style.overflow = "";
        };
        (element as any).__autotagHeightFrame = window.requestAnimationFrame(tick);
    }

    animateInlineDependencyWarning(containerEl: HTMLElement, render: () => void): void {
        const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        (containerEl as any).__autotagInlineWarningToken = token;
        const runningTimeout = (containerEl as any).__autotagInlineWarningTimeout as number | undefined;
        if (runningTimeout !== undefined) window.clearTimeout(runningTimeout);
        const runningCleanupTimeout = (containerEl as any).__autotagInlineWarningCleanupTimeout as number | undefined;
        if (runningCleanupTimeout !== undefined) window.clearTimeout(runningCleanupTimeout);
        const runningFrame = (containerEl as any).__autotagInlineWarningFrame as number | undefined;
        if (runningFrame !== undefined) window.cancelAnimationFrame(runningFrame);

        const fromHeight = containerEl.getBoundingClientRect().height;
        const oldChildren = Array.from(containerEl.children) as HTMLElement[];
        containerEl.style.height = `${fromHeight}px`;
        containerEl.style.overflow = "hidden";
        containerEl.style.transition = "";
        oldChildren.forEach(child => {
            child.getAnimations().forEach(animation => animation.cancel());
            child.addClass("autotag-inline-dependency-warning-exiting");
        });

        const renderNextState = () => {
            if ((containerEl as any).__autotagInlineWarningToken !== token) return;
            (containerEl as any).__autotagInlineWarningTimeout = undefined;
            render();
            const toHeight = this.measureNaturalSettingsHeight(containerEl, containerEl.scrollHeight);
            if (Math.abs(toHeight - fromHeight) < 1) {
                containerEl.style.height = "";
                containerEl.style.overflow = "";
                containerEl.style.transition = "";
                return;
            }

            containerEl.style.transition = "height 240ms cubic-bezier(0.22, 1, 0.36, 1)";
            const finishToken = token;
            const cleanup = () => {
                if ((containerEl as any).__autotagInlineWarningToken !== finishToken) return;
                containerEl.style.height = "";
                containerEl.style.overflow = "";
                containerEl.style.transition = "";
                (containerEl as any).__autotagInlineWarningCleanupTimeout = undefined;
            };
            (containerEl as any).__autotagInlineWarningCleanupTimeout = window.setTimeout(cleanup, 260);
            window.requestAnimationFrame(() => {
                if ((containerEl as any).__autotagInlineWarningToken !== token) return;
                containerEl.style.height = `${toHeight}px`;
            });
        };

        (containerEl as any).__autotagInlineWarningTimeout = window.setTimeout(
            renderNextState,
            oldChildren.length > 0 ? 150 : 0
        );
    }

    animateSettingsCollapseThenRender(containerEl: HTMLElement, render: () => void): void {
        const previousHeight = containerEl.getBoundingClientRect().height;
        const oldChildren = Array.from(containerEl.children) as HTMLElement[];
        const duration = 520;
        const fadeDuration = 180;
        const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        (containerEl as any).__autotagContentAnimationToken = token;

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
            if ((containerEl as any).__autotagContentAnimationToken !== token) return;
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
        (containerEl as any).__autotagContentAnimationToken = token;

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
            if ((containerEl as any).__autotagContentAnimationToken !== token) return;
            const settledHeight = this.measureNaturalSettingsHeight(containerEl, nextHeight);
            containerEl.style.height = `${settledHeight}px`;
            containerEl.style.overflow = "";
            window.setTimeout(() => {
                if ((containerEl as any).__autotagContentAnimationToken !== token) return;
                const lockedHeight = containerEl.getBoundingClientRect().height;
                const naturalHeight = this.measureNaturalSettingsHeight(containerEl, lockedHeight);
                if (Math.abs(naturalHeight - lockedHeight) < 2) {
                    containerEl.style.height = "";
                    return;
                }
                containerEl.style.overflow = "hidden";
                this.tweenSettingsHeight(containerEl, lockedHeight, naturalHeight, 160, () => {
                    if ((containerEl as any).__autotagContentAnimationToken !== token) return;
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
        this.renderProblemWarningPanel(
            containerEl,
            "autotag-geolocation-warning",
            "Reverse geocode attention",
            this.getReverseGeocodeProblemWarningLines(),
            "warning",
            "This affects place-name fields such as country, region, city, and address. GPS coordinates can still be written when image metadata contains them."
        );

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

        const geolocationSetupEl = this.createSettingsRevealContainer(containerEl, "autotag-subcategory");
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
            const localNominatimEl = localNominatimHostEl.createDiv({ cls: "autotag-property-panel" });
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
            const propertiesEl = this.createSettingsRevealContainer(propertiesHostEl, "autotag-subcategory");
            propertiesEl.createEl("h4", { text: "Geolocation Tags Properties" });
            propertiesEl.createEl("p", {
                text: "Choose which location fields to write and rename their frontmatter properties. These properties remain available as suggestions in other property fields.",
                cls: "setting-item-description",
            });
            const propertyListEl = propertiesEl.createDiv({ cls: "autotag-geolocation-property-list" });
            const updateGeolocationPropertyTitles = () => {
                const titles = Array.from(propertyListEl.querySelectorAll("[data-autotag-geolocation-property-title]")) as HTMLElement[];
                titles.forEach((titleEl, index) => titleEl.setText(`Geolocation Property ${index + 1}`));
            };
            const renderGeolocationPropertyPanel = (mapping: GeolocationPropertyMapping, index: number) => {
                const propertyPanelEl = propertyListEl.createDiv({ cls: "autotag-property-panel" });
                propertyPanelEl.id = `autotag-geolocation-property-${mapping.id}`;
                propertyPanelEl.dataset.geolocationPropertyId = mapping.id;
                this.applyRecentlyAddedPanelHighlight(propertyPanelEl, "geolocation-property", mapping.id);
                propertyPanelEl.createEl("h5", {
                    text: `Geolocation Property ${index + 1}`,
                    attr: { "data-autotag-geolocation-property-title": "true" },
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

        const fixEl = this.createSettingsRevealContainer(containerEl, "autotag-subcategory");
        const getQueuedGeolocationDesc = () => {
            const queuedCount = this.plugin.settings.pendingGeocodeJobs.length;
            return `${queuedCount} geolocation lookup${queuedCount === 1 ? "" : "s"} currently queued.`;
        };
        fixEl.createEl("h4", { text: "Fix" });
        const fixPanelEl = fixEl.createDiv({ cls: "autotag-property-panel autotag-geolocation-fix-panel" });
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
                button.buttonEl.addClass("autotag-danger-button");
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

    refreshFolderPropertyValuesIfVisible(): void {
        if (this.activeSettingsSection !== "folder-tags") return;
        this.refreshDisplayAnimated();
    }

    openSettingsProblemTarget(sectionId: string, solutionAnchorId?: string, fallbackAnchorId?: string): void {
        this.activeSettingsSection = sectionId;
        this.display();
        window.setTimeout(() => {
            const solutionEl = solutionAnchorId
                ? this.containerEl.querySelector(`#${solutionAnchorId}`) as HTMLElement | null
                : null;
            const fallbackEl = fallbackAnchorId
                ? this.containerEl.querySelector(`#${fallbackAnchorId}`) as HTMLElement | null
                : null;
            const targetEl = solutionEl ?? fallbackEl;
            if (targetEl) {
                targetEl.scrollIntoView({ block: "center", behavior: "smooth" });
            } else {
                this.scrollSettingsToTop();
            }
        }, 0);
    }

    getSettingsSections(): { id: string; label: string; icon: string; keywords: string[] }[] {
        return [
            { id: "health", label: "Health", icon: "activity", keywords: ["health", "check", "test", "status", "ollama", "vision", "nominatim", "queue", "duplicate", "failed", "processed"] },
            { id: "setup", label: "Setup", icon: "wrench", keywords: ["overview", "how it works", "start", "setup", "base path", "file name", "location", "format"] },
            { id: "search", label: "Search", icon: "search", keywords: ["find", "settings", "options"] },
            { id: "folder-tags", label: "Folder Tags", icon: "folder", keywords: ["folder", "property lists", "fallback", "candidates"] },
            { id: "ai-tags", label: "AI Tags", icon: "sparkles", keywords: ["ollama", "model", "vision", "llava", "gemma", "qwen", "filename", "candidate", "generated tags"] },
            { id: "geolocation", label: "Geolocation Tags", icon: "map-pin", keywords: ["gps", "reverse geocode", "nominatim", "location"] },
            { id: "properties", label: "Properties", icon: "database", keywords: ["frontmatter", "template", "linktofile", "aitags", "aidescription", "embed"] },
            { id: "vault-awareness", label: "Vault Awareness", icon: "vault", keywords: ["vault", "vocabulary", "linguistic", "known concepts"] },
            { id: "bridge", label: "Bridge", icon: "waypoints", keywords: ["manual bridge", "enrichment", "rules", "subject"] },
            { id: "processing", label: "Processing & Queue", icon: "list-checks", keywords: ["queue", "workers", "wait", "bulk"] },
            { id: "duplicates", label: "Duplicates", icon: "copy-check", keywords: ["duplicate", "hash", "pair", "manual pairing", "replace"] },
            { id: "fix-recover", label: "Fix / Recover", icon: "wrench", keywords: ["failed", "retry", "recover", "help", "processed", "forget", "reprocess"] },
            { id: "qol", label: "QoL", icon: "sliders-horizontal", keywords: ["shutdown", "delete pair", "quality of life"] },
            { id: "thanks", label: "Thanks", icon: "heart", keywords: ["thanks", "credit", "inspired", "dependencies", "templater"] },
        ];
    }

    getSettingsSectionIcon(id: string): string {
        return this.getSettingsSections().find(section => section.id === id)?.icon ?? "circle";
    }

    getSettingsHeadingIcon(title: string): string | null {
        const icons: Record<string, string> = {
            "Path Setup": "folder-cog",
            "Setup - Companion Paths": "folder-cog",
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
            "AI - Image Analysis": "image",
            "AI Tags - Tag Model": "cpu",
            "AI Input": "list-filter",
            "Image Description": "file-text",
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
            "Search": "search-check",
            "Manual Pairing": "link",
            "Hashes": "fingerprint",
            "Vault Setup": "vault",
            "Bridge Setup": "waypoints",
            "Bridge Enrichment Rules": "waypoints",
            "Processing Setup": "list-checks",
            "Companion Notes": "file-stack",
            "Single File": "refresh-cw",
            "Existing Vaults": "folder-sync",
            "Failed Files": "triangle-alert",
            "Processed Files": "circle-check",
            "Limited File Type Warnings": "file-warning",
            "Thanks": "heart",
        };
        return icons[title] ?? null;
    }

    decorateHeadingWithIcon(headingEl: HTMLElement, icon: string | null): void {
        if (!icon || headingEl.querySelector(".autotag-heading-icon")) return;
        const label = headingEl.textContent?.trim() ?? "";
        headingEl.empty();
        const iconEl = headingEl.createSpan({ cls: "autotag-heading-icon" });
        setIcon(iconEl, icon);
        headingEl.createSpan({ text: label, cls: "autotag-heading-label" });
    }

    decorateSettingsHeadings(containerEl: HTMLElement): void {
        (Array.from(containerEl.querySelectorAll("h3[id^='autotag-']")) as HTMLElement[]).forEach(heading => {
            const id = heading.id.replace("autotag-", "");
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

        const navEl = containerEl.createDiv({ cls: "autotag-settings-tabs" });
        sections.forEach(section => {
            const button = navEl.createEl("button");
            button.type = "button";
            const iconEl = button.createSpan({ cls: "autotag-tab-icon" });
            setIcon(iconEl, section.icon);
            button.createSpan({ text: section.label, cls: "autotag-tab-label" });
            if (section.id === this.activeSettingsSection) button.addClass("is-active");
            button.onclick = () => {
                this.closeInfoDescriptions();
                this.activeSettingsSection = section.id;
                this.display();
            };
        });
    }
    renderHowItWorksPanel(containerEl: HTMLElement, title: string, body: string, warning = false): void {
        const panel = containerEl.createDiv({ cls: warning ? "autotag-how-panel autotag-how-panel-warning" : "autotag-how-panel" });
        panel.createEl("strong", { text: title });
        panel.createEl("p", { text: body, cls: "setting-item-description" });
    }

    renderThanksSettings(containerEl: HTMLElement): void {
        const projects = [
            {
                name: "Binary File Manager",
                url: "https://github.com/qawatake/obsidian-binary-file-manager-plugin",
                description: "Autotag was lovingly inspired by companion-note workflows around Binary File Manager. It now handles its own companion-note flow, but the original idea deserves a clear nod.",
            },
            {
                name: "Templater",
                url: "https://github.com/SilentVoid13/Templater",
                description: "Templater helped shape how flexible note templates can feel in Obsidian. Autotag keeps its own internal and file-template handling so users do not need another required plugin.",
            },
            {
                name: "AI Image Analyzer",
                url: "https://github.com/Swaggeroo/obsidian-ai-image-analyzer",
                description: "AI Image Analyzer explored a thoughtful image-to-metadata workflow for Obsidian. Autotag now runs its own local Ollama vision path, with real thanks for the inspiration.",
            },
        ];

        containerEl.createEl("p", {
            text: "Autotag is independent and does not require these plugins. This tab is here as a small thank-you to community projects whose ideas, care, or workflow patterns helped inspire it.",
            cls: "setting-item-description",
        });

        projects.forEach(project => {
            const panelEl = containerEl.createDiv({ cls: "autotag-property-panel" });
            panelEl.createEl("h5", { text: project.name });
            new Setting(panelEl)
                .setName("Project")
                .setDesc(project.description)
                .addButton(button => button
                    .setButtonText("Open Project")
                    .onClick(() => {
                        window.open(project.url);
                    }));
        });
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
            const panel = containerEl.createDiv({ cls: "autotag-settings-profile-video" });
            const header = panel.createDiv({ cls: "autotag-settings-profile-video-header" });
            const iconEl = header.createSpan({ cls: "autotag-heading-icon" });
            setIcon(iconEl, "play-circle");
            header.createSpan({ text: "Dev setup video" });
            panel.createDiv({
                cls: "autotag-settings-profile-video-placeholder",
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
        const panelEl = containerEl.createDiv({ cls: "autotag-property-panel autotag-settings-profile-panel" });
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

        const dropEl = panelEl.createDiv({ cls: "autotag-settings-profile-dropzone" });
        dropEl.createDiv({ text: "Drop setup JSON files here", cls: "autotag-settings-profile-dropzone-title" });
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
                button.buttonEl.addClass("autotag-danger-button");
            });

        videoHostEl = panelEl.createDiv({ cls: "autotag-settings-profile-video-host" });
        void refreshProfileDropdown();
    }

    renderSoftWarningPanel(containerEl: HTMLElement, title: string, body: string): void {
        const panel = containerEl.createDiv({ cls: "autotag-soft-warning-panel" });
        panel.createEl("strong", { text: title });
        panel.createEl("p", { text: body, cls: "setting-item-description" });
    }

    renderAttentionWarningPanel(containerEl: HTMLElement, id: string, title: string, lines: string[]): void {
        if (lines.length === 0) return;
        const panel = containerEl.createDiv({ cls: "autotag-attention-warning-panel" });
        panel.id = id;
        panel.createEl("strong", { text: title });
        const listEl = panel.createEl("ul");
        lines.forEach(line => listEl.createEl("li", { text: line }));
    }

    renderProblemWarningPanel(containerEl: HTMLElement, id: string, title: string, lines: string[], tone: "warning" | "danger" = "warning", description = ""): void {
        if (lines.length === 0) return;

        const panel = containerEl.createDiv({
            cls: `autotag-attention-warning-panel autotag-problem-warning-panel is-${tone}`,
        });
        panel.id = id;
        panel.createEl("strong", { text: title });
        if (description) {
            panel.createEl("p", { text: description, cls: "setting-item-description autotag-problem-warning-description" });
        }
        const listEl = panel.createEl("ul");
        lines.forEach(line => listEl.createEl("li", { text: line }));
    }

    renderInlineDependencyWarning(containerEl: HTMLElement, title: string, lines: string[], icon = "alert-triangle"): void {
        containerEl.addClass("autotag-inline-dependency-warning-host");
        if (lines.length === 0) return;

        const panel = containerEl.createDiv({
            cls: "autotag-attention-warning-panel autotag-problem-warning-panel autotag-inline-dependency-warning is-warning",
        });
        panel.addClass("autotag-inline-dependency-warning-entering");
        const titleEl = panel.createEl("strong");
        const iconEl = titleEl.createSpan({ cls: "autotag-inline-dependency-warning-icon" });
        setIcon(iconEl, icon);
        titleEl.createSpan({ text: title });
        const listEl = panel.createEl("ul");
        lines.forEach(line => listEl.createEl("li", { text: line }));
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                if (!panel.isConnected) return;
                panel.removeClass("autotag-inline-dependency-warning-entering");
            });
        });
    }

    getVaultVocabularyAdvancedWarningLines(enabled: boolean, vaultAwarenessEnabled: boolean, source: "ai-tags" | "property" | "fallback"): string[] {
        if (!enabled) return [];
        const lines = source === "ai-tags"
            ? [
                "Only enable this if you know what you are doing. AI-generated tags can feed back into Vault Awareness and then influence future AI tags, canonicalization, and routed output.",
                "This may drastically alter tagging behavior, reinforce incorrect or overly broad tags, and lead to an escalating feedback loop.",
            ]
            : [
                "Only enable this if you know what you are doing. Values from this property become Vault Awareness vocabulary and can strongly influence future AI tagging, canonicalization, and routed output.",
                "If noisy or broad values are scanned back into the vocabulary, this may lead to an escalating feedback loop.",
            ];
        if (!vaultAwarenessEnabled) {
            lines.push(source === "fallback"
                ? "Vault Awareness is currently disabled; this fallback vocabulary source will apply once Vault Awareness is enabled."
                : "Vault Awareness is currently disabled; this vocabulary source will apply once Vault Awareness is enabled.");
        }
        return lines;
    }

    isHealthConcern(result: HealthCheckResult | undefined): boolean {
        return result?.tone === "danger" || result?.tone === "warning";
    }

    getCachedHealthConcernLines(id: string, fallbackLabel: string): string[] {
        const result = this.healthCheckResults.get(id);
        if (!this.isHealthConcern(result)) return [];

        const lines = (result?.checks ?? [])
            .filter(check => check.tone === "danger" || check.tone === "warning")
            .map(check => check.text);
        if (result?.message) lines.unshift(result.message);
        if (lines.length > 0) return Array.from(new Set(lines));
        return [`${fallbackLabel}: ${result?.value ?? "Needs attention"}`];
    }

    getSetupProblemWarningLines(): string[] {
        const normalizeFolder = (path: string, fallback: string) => (path.trim() || fallback).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        const basePath = normalizeFolder(this.plugin.settings.basePath, DEFAULT_SETTINGS.basePath);
        const notePath = this.plugin.getEffectiveCompanionNoteFolder();
        const baseFolder = this.app.vault.getAbstractFileByPath(basePath);
        const noteFolder = this.app.vault.getAbstractFileByPath(notePath);
        const lines: string[] = [];

        if (!(baseFolder instanceof TFolder)) lines.push(`Base Path for Watched Files is missing: ${basePath}. Set it to the folder where new source files arrive.`);
        if (!(noteFolder instanceof TFolder)) lines.push(`Companion Note Folder is missing: ${notePath}. Set it to the folder where companion notes are created.`);
        return lines;
    }

    getImageAnalysisProblemWarningLines(): string[] {
        if (!this.plugin.settings.imageAnalysisEnabled) return [];
        const result = this.healthCheckResults.get("image-analysis");
        if (!this.isHealthConcern(result)) return [];

        const selectedModel = this.plugin.getOllamaVisionModel();
        if (result?.value === "Failed") {
            return [`Ollama is not reachable at ${this.plugin.settings.ollamaBaseUrl || DEFAULT_SETTINGS.ollamaBaseUrl}. Start Ollama or update the Ollama Local URL.`];
        }
        if (result?.value === "No models") {
            return ["Ollama is reachable, but no pulled models were listed. Pull the selected vision model or choose a model that is already installed."];
        }
        if (result?.value === "Model missing") {
            return [`The selected vision model '${selectedModel}' is not pulled. Use Pull Vision Model or choose an installed model from the dropdown.`];
        }
        return this.getCachedHealthConcernLines("image-analysis", "Image Analysis");
    }

    getOllamaProblemWarningLines(): string[] {
        const result = this.healthCheckResults.get("ai-ollama");
        if (!this.isHealthConcern(result)) return [];

        const selectedModel = this.plugin.settings.ollamaModel.trim() || DEFAULT_SETTINGS.ollamaModel;
        if (result?.value === "Failed") {
            return [`Ollama is not reachable at ${this.plugin.settings.ollamaBaseUrl || DEFAULT_SETTINGS.ollamaBaseUrl}. Start Ollama or update the Ollama Local URL.`];
        }
        if (result?.value === "No models") {
            return ["Ollama is reachable, but no pulled models were listed. Pull the selected model or choose a model that is already installed."];
        }
        if (result?.value === "Model missing") {
            return [`The selected tag model '${selectedModel}' is not pulled. Use Pull Tag Model or choose an installed model from the dropdown.`];
        }
        return this.getCachedHealthConcernLines("ai-ollama", "Ollama");
    }

    getReverseGeocodeProblemWarningLines(): string[] {
        const result = this.healthCheckResults.get("geolocation-geocode");
        if (!this.isHealthConcern(result)) return [];

        if (this.plugin.settings.geolocationProvider === "local-nominatim") {
            return ["Local Nominatim did not return location data. Check the Local Nominatim URL or switch to Public Nominatim while testing."];
        }
        return ["Reverse geocoding did not return location data. Coordinates can still be written, but place names need a working provider."];
    }

    getVaultAwarenessProblemWarningLines(): string[] {
        if (!this.plugin.settings.vaultAwarenessEnabled || this.plugin.settings.aiTaggingEnabled) return [];
        return [
            "Vault Awareness currently runs through the AI tagging pipeline. Enable AI Tagging via Ollama so Vault Awareness can rank, verify, and write recognized vault terms.",
            "Open Health after changing the setting to confirm the local tag model is reachable and ready.",
        ];
    }

    getFolderTagsDependencyWarningLines(): string[] {
        if (!this.plugin.settings.useFolderTags) return [];
        const lines: string[] = [];
        if (this.plugin.hasConfiguredFolderAiCandidateSource() && !this.plugin.settings.aiTaggingEnabled) {
            lines.push("One or more Folder Tags AI candidate modes are enabled, but AI Tagging is off. Enable AI Tagging for those folder values to influence AI Tags.");
        }
        const hasVaultCandidateSource = this.plugin.getFolderPropertyMappings().some(mapping => mapping.useAsVaultCandidate)
            || this.plugin.settings.folderFallbackUseAsVaultCandidate;
        if (hasVaultCandidateSource && !this.plugin.settings.vaultAwarenessEnabled) {
            lines.push("One or more Folder Tags properties are marked as Vault Awareness vocabulary, but Vault Awareness is off. Enable Vault Awareness for those properties to build vault vocabulary.");
        }
        return lines;
    }

    getAiInputDependencyWarningLines(): string[] {
        const lines: string[] = [];
        if ((this.plugin.settings.useGeolocationForAiTags || this.plugin.settings.useGeolocationForAiDescription) && !this.plugin.settings.geolocationEnabled) {
            lines.push("Use geolocation as AI context is enabled, but Geolocation Tags are off. Enable Geolocation Tags so AI can receive GPS and reverse-geocode context.");
        }
        return lines;
    }

    getAiPropertiesDependencyWarningLines(): string[] {
        const lines: string[] = [];
        if (this.plugin.settings.removeFolderTagsFromAiTags && !this.plugin.settings.useFolderTags) {
            lines.push("Keep Folder Tags values out of AI Tags is enabled, but Folder Tags are off. The cleanup will apply once Folder Tags are enabled.");
        }
        if (this.plugin.settings.removeGeolocationFromAiTags && !this.plugin.settings.geolocationEnabled) {
            lines.push("Keep geolocation values out of AI Tags is enabled, but Geolocation Tags are off. The cleanup will apply once Geolocation Tags are enabled.");
        }
        if (this.plugin.settings.aiTagsUseAsVaultCandidate && !this.plugin.settings.vaultAwarenessEnabled) {
            lines.push("AI Tags are marked as Vault Awareness vocabulary, but Vault Awareness is off. Enable Vault Awareness to scan this property.");
        }
        return lines;
    }

    getBridgeDependencyWarningLines(): string[] {
        if (!this.plugin.settings.bridgeEnabled
            && !this.plugin.settings.manualEnrichmentEnabled
            && !this.plugin.settings.selfLearningBridgeEnabled) return [];
        const lines: string[] = [];
        if (this.plugin.settings.selfLearningBridgeEnabled && !this.plugin.settings.vaultAwarenessEnabled) {
            lines.push("Self-learning Bridge is enabled, but Vault Awareness is off. Enable Vault Awareness so relationships have existing vocabulary to target.");
        }
        if (this.plugin.settings.selfLearningBridgeEnabled && !this.plugin.settings.aiTaggingEnabled) {
            lines.push("Self-learning Bridge is enabled, but AI Tagging is off. Enable AI Tagging so the relationship pass can run.");
        }
        if (this.plugin.settings.bridgeEnabled
            && !this.plugin.settings.bridgeUseAiInput
            && !this.plugin.settings.bridgeUseFilenameInput
            && !this.plugin.settings.bridgeUseFolderInput
            && !this.plugin.settings.bridgeUseGeolocationInput) {
            lines.push("Evidence-aware Bridge rules are enabled, but every Bridge input is off. Enable at least one Bridge input or turn evidence-aware rules off.");
        }
        if (this.plugin.settings.manualEnrichmentEnabled && !this.plugin.hasUsableBridgeInput()) {
            lines.push("Direct expansion rules are enabled, but no Bridge input can currently provide source terms. Enable AI Tagging for AI input, or enable a usable filename, Folder Tags, or Geolocation input.");
        }
        if (this.plugin.settings.bridgeUseAiInput && !this.plugin.settings.aiTaggingEnabled) {
            lines.push("Bridge AI input is enabled, but AI Tagging is off. Bridge can still use filename, Folder Tags, or Geolocation inputs when those are enabled.");
        }
        if (this.plugin.settings.bridgeUseFilenameInput && this.plugin.settings.filenameCandidateMode === "disabled") {
            lines.push("Bridge filename input is enabled, but Filename Candidate Mode is disabled in AI Input.");
        }
        if (this.plugin.settings.bridgeUseFolderInput && !this.plugin.hasActiveFolderAiCandidateSource()) {
            lines.push(this.plugin.settings.useFolderTags
                ? "Bridge folder input is enabled, but no Folder Tags candidate source is set to Consider or All Keywords."
                : "Bridge folder input is enabled, but Folder Tags are off.");
        }
        if (this.plugin.settings.bridgeUseGeolocationInput && !this.plugin.settings.geolocationEnabled) {
            lines.push("Bridge geolocation input is enabled, but Geolocation Tags are off. Enable Geolocation Tags for Bridge to use known location metadata.");
        }
        if (this.plugin.settings.bridgeUsePreBridgeVaultAwarenessOutput && !this.plugin.settings.vaultAwarenessEnabled) {
            lines.push("Pre-Bridge terms for Vault Awareness output are enabled, but Vault Awareness is off. This will apply once Vault Awareness is enabled.");
        }
        return lines;
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
        const baseExists = baseFolder instanceof TFolder;
        const noteExists = noteFolder instanceof TFolder;
        return [
            { tone: baseExists ? "success" : "danger", text: "Source folder exists" },
            { tone: noteExists ? "success" : "danger", text: "Companion note folder exists" },
            { tone: exampleNoteName ? "success" : "danger", text: `Example note name: ${exampleNoteName || "No filename"}` },
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
            const rowEl = containerEl.createDiv({ cls: `autotag-health-check-row is-${check.tone}` });
            const iconEl = rowEl.createSpan({ cls: "autotag-health-check-icon" });
            setIcon(iconEl, this.getHealthCheckIconName(check.tone));
            const textEl = rowEl.createSpan({ cls: "autotag-health-check-text" });
            textEl.createSpan({ text: check.text });
            if (check.tone === "spinner") {
                const dotsEl = textEl.createSpan({ cls: "autotag-loading-dots" });
                [0, 1, 2].forEach(() => dotsEl.createSpan({ text: "." }));
            }
        });
    }

    renderHealthDashboardValue(containerEl: HTMLElement, card: HealthDashboardCard): void {
        containerEl.empty();
        containerEl.createSpan({ text: card.value });
    }

    getHealthDashboardCardSignature(card: HealthDashboardCard): string {
        return [
            card.tone ?? "neutral",
            card.value,
            card.description,
            ...(card.checks ?? []).map(check => `${check.tone}:${check.text}`),
        ].join("\u001f");
    }

    getHealthDashboardCards(): HealthDashboardCard[] {
        const basePath = (this.plugin.settings.basePath || DEFAULT_SETTINGS.basePath).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        const notePath = this.plugin.getEffectiveCompanionNoteFolder();
        const baseFolder = this.app.vault.getAbstractFileByPath(basePath);
        const noteFolder = this.app.vault.getAbstractFileByPath(notePath);
        const exampleNoteName = this.plugin.renderCompanionNoteNameFormatFromParts("Example.jpg", `${basePath}/Example.jpg`, "jpg");
        const setupChecks = this.healthCheckResults.get("setup-paths")?.checks ?? this.getSetupHealthChecks(baseFolder, noteFolder, exampleNoteName);
        const folderMappingCount = this.plugin.settings.folderPropertyMappings.length;
        const templateAvailable = this.plugin.isTemplateSourceAvailable();
        const templateUnknown = templateAvailable ? this.plugin.getFrontmatterPreviewTemplateCheck() : [];
        const templateMissing = templateAvailable ? this.plugin.getMissingTemplateDeclarationProperties() : [];
        const vocabularyCount = this.plugin.vaultVocabulary.size;
        const vaultCandidateProperties = this.plugin.getVaultAwarenessCandidateProperties();
        const bridgeRuleCount = this.plugin.parseManualSubjectBridgeRules().length;
        const enrichmentRuleCount = this.plugin.parseManualEnrichmentRules().size;
        const bridgeEvidenceActive = this.plugin.settings.bridgeEnabled;
        const bridgeDirectActive = this.plugin.settings.manualEnrichmentEnabled;
        const selfLearningBridgeActive = this.plugin.settings.selfLearningBridgeEnabled;
        const bridgeAnyActive = bridgeEvidenceActive || bridgeDirectActive || selfLearningBridgeActive;
        const bridgeHasActiveRules = (bridgeEvidenceActive && bridgeRuleCount > 0)
            || (bridgeDirectActive && enrichmentRuleCount > 0);
        const visibleProcessingQueueCount = this.plugin.getUniqueProcessingPaths().length;
        const activeRunCount = this.plugin.currentRunIds.size;
        const processingCounts = this.plugin.getProcessingActivityCounts();
        const expensiveCounts = this.plugin.getExpensiveHealthCounts();
        const duplicateUnlinkedHashCount = expensiveCounts.duplicateUnlinkedHashCount;
        const duplicateUnhashedFileCount = expensiveCounts.duplicateUnhashedFileCount;
        const duplicateUnpairedFileCount = expensiveCounts.duplicateUnpairedFileCount;
        const duplicateHashAttentionCount = duplicateUnlinkedHashCount + duplicateUnhashedFileCount;
        const duplicateAttentionCount = duplicateUnlinkedHashCount + duplicateUnhashedFileCount + duplicateUnpairedFileCount;
        const duplicateProtectionActive = this.plugin.settings.duplicateDetectionMode !== "off";
        const recoverUnprocessedBaseFileCount = expensiveCounts.recoverUnprocessedBaseFileCount;
        const recoverFailedCount = this.plugin.getFailedFileRecordsNeedingAttention().length;
        const recoverProcessedCount = this.plugin.settings.processedFiles.length;
        const setupProblemLines = this.getSetupProblemWarningLines();
        const imageAnalysisProblemLines = this.getImageAnalysisProblemWarningLines();
        const ollamaProblemLines = this.getOllamaProblemWarningLines();
        const geocodeProblemLines = this.getReverseGeocodeProblemWarningLines();
        const vaultAwarenessProblemLines = this.getVaultAwarenessProblemWarningLines();
        const bridgeProblemLines = this.getBridgeDependencyWarningLines();
        const duplicateSolutionAnchorId = duplicateHashAttentionCount > 0
            ? "autotag-duplicate-hashes-warning"
            : duplicateUnpairedFileCount > 0 ? "autotag-duplicate-fix-warning" : undefined;
        const recoverSolutionAnchorId = recoverFailedCount > 0
            ? "autotag-failed-files-warning"
            : recoverUnprocessedBaseFileCount > 0 ? "autotag-unprocessed-files-warning" : undefined;
        const setupCheck = this.getHealthCheckFallback("setup-paths", "Setup - Companion Paths");
        const imageAnalysisCheck = this.getHealthCheckFallback("image-analysis", "AI - Image Analysis");
        const ollamaCheck = this.getHealthCheckFallback("ai-ollama", "AI Tags - Tag Model");
        const geocodeCheck = this.getHealthCheckFallback("geolocation-geocode", "Geolocation Tags - Reverse Geocode");

        return [
            {
                id: "setup-paths",
                label: "Setup - Companion Paths",
                icon: this.getSettingsSectionIcon("setup"),
                targetSectionId: "setup",
                solutionAnchorId: setupProblemLines.length > 0 ? "autotag-setup-path-warning" : undefined,
                value: this.healthCheckResults.has("setup-paths")
                    ? setupCheck.value
                    : setupProblemLines.length === 0 ? "Ready" : "Needs check",
                description: setupCheck.message,
                checks: setupChecks,
                tone: this.healthCheckResults.has("setup-paths") ? setupCheck.tone : setupProblemLines.length === 0 ? "success" : "danger",
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
                id: "image-analysis",
                label: "AI - Image Analysis",
                icon: this.getSettingsSectionIcon("ai-tags"),
                targetSectionId: "ai-tags",
                solutionAnchorId: imageAnalysisProblemLines.length > 0 ? "autotag-image-analysis-warning" : undefined,
                value: imageAnalysisCheck.value,
                description: imageAnalysisCheck.message,
                checks: imageAnalysisCheck.checks,
                tone: imageAnalysisCheck.tone,
            },
            {
                id: "ai-ollama",
                label: "AI Tags - Tag Model",
                icon: this.getSettingsSectionIcon("ai-tags"),
                targetSectionId: "ai-tags",
                solutionAnchorId: ollamaProblemLines.length > 0 ? "autotag-ai-ollama-warning" : undefined,
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
                solutionAnchorId: geocodeProblemLines.length > 0 ? "autotag-geolocation-warning" : undefined,
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
                solutionAnchorId: templateUnknown.length > 0 ? "autotag-properties-template-check-warning" : undefined,
                value: !templateAvailable ? "Unavailable" : templateUnknown.length > 0 ? `${templateUnknown.length} unknown` : "Clean",
                description: "",
                checks: [
                    !templateAvailable
                        ? { tone: "warning", text: "No template file available" }
                        : { tone: templateUnknown.length > 0 ? "warning" : "success", text: templateUnknown.length > 0 ? "Unknown template entries" : "Template check clean" },
                ],
                tone: !templateAvailable ? "warning" : templateUnknown.length > 0 ? "warning" : "success",
            },
            {
                id: "properties-template-suggestions",
                label: "Properties - Template Suggestions",
                icon: this.getSettingsSectionIcon("properties"),
                targetSectionId: "properties",
                solutionAnchorId: templateMissing.length > 0 ? "autotag-properties-template-suggestions-warning" : undefined,
                value: !templateAvailable ? "Unavailable" : templateMissing.length > 0 ? `${templateMissing.length} undeclared` : "Declared",
                description: "",
                checks: [
                    !templateAvailable
                        ? { tone: "warning", text: "No template file available" }
                        : { tone: templateMissing.length > 0 ? "warning" : "success", text: templateMissing.length > 0 ? "Optional declarations" : "All active properties declared" },
                ],
                tone: !templateAvailable ? "warning" : templateMissing.length > 0 ? "warning" : "success",
            },
            {
                id: "vault-awareness",
                label: "Vault Awareness",
                icon: this.getSettingsSectionIcon("vault-awareness"),
                targetSectionId: "vault-awareness",
                solutionAnchorId: vaultAwarenessProblemLines.length > 0 ? "autotag-vault-awareness-warning" : undefined,
                value: vaultAwarenessProblemLines.length > 0
                    ? "Needs AI Tags"
                    : this.plugin.settings.vaultAwarenessEnabled ? `${vocabularyCount} known` : "Off",
                description: "",
                checks: [
                    { tone: this.plugin.settings.vaultAwarenessEnabled ? "success" : "neutral", text: this.plugin.settings.vaultAwarenessEnabled ? "Vault Awareness enabled" : "Vault Awareness disabled" },
                    ...(vaultAwarenessProblemLines.length > 0 ? [{ tone: "warning" as const, text: "AI Tagging is required" }] : []),
                    { tone: vaultCandidateProperties.length > 0 ? "success" : "neutral", text: `${vaultCandidateProperties.length} candidate propert${vaultCandidateProperties.length === 1 ? "y" : "ies"}` },
                    { tone: vocabularyCount > 0 ? "success" : "neutral", text: `${vocabularyCount} known term${vocabularyCount === 1 ? "" : "s"}` },
                ],
                tone: vaultAwarenessProblemLines.length > 0
                    ? "warning"
                    : this.plugin.settings.vaultAwarenessEnabled && vocabularyCount > 0 ? "success" : "neutral",
            },
            {
                id: "bridge",
                label: "Bridge",
                icon: this.getSettingsSectionIcon("bridge"),
                targetSectionId: "bridge",
                solutionAnchorId: bridgeProblemLines.length > 0 ? "autotag-bridge-dependency-warning" : undefined,
                value: bridgeProblemLines.length > 0 ? "Needs input" : bridgeHasActiveRules || selfLearningBridgeActive ? "On" : bridgeAnyActive ? "Ready" : "Off",
                description: "",
                checks: [
                    ...(bridgeProblemLines.length > 0 ? [{ tone: "warning" as const, text: "Input dependency needs attention" }] : []),
                    { tone: bridgeEvidenceActive ? "success" : "neutral", text: bridgeEvidenceActive ? "Evidence-aware rules enabled" : "Evidence-aware rules disabled" },
                    { tone: bridgeDirectActive ? "success" : "neutral", text: bridgeDirectActive ? "Direct expansion rules enabled" : "Direct expansion rules disabled" },
                    { tone: selfLearningBridgeActive ? "success" : "neutral", text: selfLearningBridgeActive ? "Self-learning Bridge enabled" : "Self-learning Bridge disabled" },
                    { tone: bridgeRuleCount > 0 ? "success" : "neutral", text: `${bridgeRuleCount} evidence-aware rule${bridgeRuleCount === 1 ? "" : "s"}` },
                    { tone: enrichmentRuleCount > 0 ? "success" : "neutral", text: `${enrichmentRuleCount} direct expansion rule${enrichmentRuleCount === 1 ? "" : "s"}` },
                ],
                tone: bridgeProblemLines.length > 0 ? "warning" : bridgeHasActiveRules || selfLearningBridgeActive ? "success" : "neutral",
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
                    { tone: recoverUnprocessedBaseFileCount > 0 ? "danger" : "success", text: `${recoverUnprocessedBaseFileCount} unprocessed watched file${recoverUnprocessedBaseFileCount === 1 ? "" : "s"}` },
                    { tone: "neutral", text: `${recoverProcessedCount} processed file${recoverProcessedCount === 1 ? "" : "s"} tracked` },
                ],
                tone: recoverFailedCount > 0 || recoverUnprocessedBaseFileCount > 0 ? "danger" : "success",
            },
        ];
    }

    renderHealthDashboardCards(containerEl: HTMLElement, cards: HealthDashboardCard[]): Map<string, HealthDashboardCardRefs> {
        const refs = new Map<string, HealthDashboardCardRefs>();
        const gridEl = containerEl.createDiv({ cls: "autotag-health-grid autotag-health-dashboard-grid" });
        cards.forEach(card => {
            const cardEl = gridEl.createDiv({ cls: `autotag-health-card is-${card.tone ?? "neutral"}` });
            cardEl.addClass("is-clickable");
            cardEl.tabIndex = 0;
            cardEl.setAttr("role", "button");
            const openTarget = () => {
                const currentCard = this.getHealthDashboardCards().find(candidate => candidate.id === card.id) ?? card;
                this.openSettingsProblemTarget(currentCard.targetSectionId, currentCard.solutionAnchorId);
            };
            cardEl.addEventListener("click", openTarget);
            cardEl.addEventListener("keydown", event => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                openTarget();
            });
            const labelEl = cardEl.createDiv({ cls: "autotag-health-card-label" });
            const iconEl = labelEl.createSpan({ cls: "autotag-health-card-icon" });
            setIcon(iconEl, card.icon);
            const labelTextEl = labelEl.createSpan({ cls: "autotag-health-card-label-text" });
            const labelParts = card.label.split(" - ");
            labelTextEl.createSpan({ text: labelParts[0], cls: "autotag-health-card-label-main" });
            if (labelParts.length > 1) {
                labelTextEl.createSpan({ text: labelParts.slice(1).join(" - "), cls: "autotag-health-card-label-sub" });
            }
            const valueEl = cardEl.createDiv({ cls: "autotag-health-card-value" });
            this.renderHealthDashboardValue(valueEl, card);
            const detailsEl = cardEl.createDiv({ cls: "autotag-health-card-details" });
            const descriptionEl = detailsEl.createDiv({ text: card.description, cls: "autotag-health-card-description" });
            descriptionEl.toggleClass("is-empty", card.description.trim().length === 0);
            const checksEl = detailsEl.createDiv({ cls: "autotag-health-checks" });
            this.renderHealthDashboardChecks(checksEl, card.checks);
            const ref = { cardEl, valueEl, detailsEl, descriptionEl, checksEl, signature: this.getHealthDashboardCardSignature(card) };
            refs.set(card.id, ref);
        });
        return refs;
    }

    updateHealthDashboardCard(refs: Map<string, HealthDashboardCardRefs>, card: HealthDashboardCard, _animate = false): void {
        const ref = refs.get(card.id);
        if (!ref) return;
        const nextSignature = this.getHealthDashboardCardSignature(card);
        if (ref.signature === nextSignature) return;
        const update = () => {
            ref.cardEl.classList.remove("is-neutral", "is-success", "is-warning", "is-danger", "is-accent");
            ref.cardEl.addClass(`is-${card.tone ?? "neutral"}`);
            this.renderHealthDashboardValue(ref.valueEl, card);
            ref.descriptionEl.setText(card.description);
            ref.descriptionEl.toggleClass("is-empty", card.description.trim().length === 0);
            this.renderHealthDashboardChecks(ref.checksEl, card.checks);
            ref.signature = nextSignature;
        };
        update();
    }

    updateHealthDashboardCards(refs: Map<string, HealthDashboardCardRefs>, animate = false): void {
        this.getHealthDashboardCards().forEach(card => this.updateHealthDashboardCard(refs, card, animate));
    }

    renderActiveProcessingImageStrip(containerEl: HTMLElement): () => void {
        const panelEl = containerEl.createDiv({ cls: "autotag-active-image-strip-panel" });
        const headerEl = panelEl.createDiv({ cls: "autotag-active-image-strip-header" });
        const titleEl = headerEl.createDiv({ cls: "autotag-active-image-strip-title" });
        const titleIconEl = titleEl.createSpan({ cls: "autotag-active-image-strip-icon" });
        setIcon(titleIconEl, "image");
        titleEl.createSpan({ text: "Active Processing Images" });
        const queueCountEl = headerEl.createDiv({ cls: "autotag-active-image-strip-queued" });
        const rowEl = panelEl.createDiv({ cls: "autotag-active-image-strip-row" });
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
                const emptyEl = rowEl.createDiv({ cls: "autotag-active-image-strip-empty" });
                emptyEl.setText("No images are actively processing.");
                return;
            }

            activeFiles.forEach(file => {
                const itemEl = rowEl.createDiv({ cls: "autotag-active-image-thumb" });
                itemEl.setAttr("title", file.path);
                const imageEl = itemEl.createEl("img", {
                    attr: {
                        src: this.app.vault.getResourcePath(file),
                        alt: file.name,
                    },
                });
                imageEl.addEventListener("error", () => {
                    itemEl.empty();
                    const fallbackEl = itemEl.createDiv({ cls: "autotag-active-image-thumb-fallback" });
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
            this.runHealthCheck("setup-paths", refs, () => this.checkSetupPaths()),
            this.runHealthCheck("image-analysis", refs, () => this.checkImageAnalysis()),
            this.runHealthCheck("ai-ollama", refs, () => this.checkOllama()),
            this.runHealthCheck("geolocation-geocode", refs, () => this.checkReverseGeocode()),
        ]);
        this.updateHealthDashboardCards(refs, true);
    }

    async checkSetupPaths(): Promise<HealthCheckResult> {
        const normalizeFolder = (path: string, fallback: string) => (path.trim() || fallback).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        const basePath = normalizeFolder(this.plugin.settings.basePath, DEFAULT_SETTINGS.basePath);
        const notePath = this.plugin.getEffectiveCompanionNoteFolder();
        const issues: string[] = [];
        const baseFolder = this.app.vault.getAbstractFileByPath(basePath);
        const noteFolder = this.app.vault.getAbstractFileByPath(notePath);

        if (!(baseFolder instanceof TFolder)) issues.push(`Base Path not found: ${basePath}`);
        if (!(noteFolder instanceof TFolder)) issues.push(`Companion Note Folder not found: ${notePath}`);

        const exampleNoteName = this.plugin.renderCompanionNoteNameFormatFromParts("Example.jpg", `${basePath}/Example.jpg`, "jpg");
        const checks = this.getSetupHealthChecks(baseFolder, noteFolder, exampleNoteName);
        if (issues.length > 0) {
            return { tone: "danger", value: "Missing", message: "", checks };
        }
        return { tone: "success", value: "Ready", message: "", checks };
    }

    async checkImageAnalysis(): Promise<HealthCheckResult> {
        if (!this.plugin.settings.imageAnalysisEnabled) {
            return {
                tone: "neutral",
                value: "Off",
                message: "",
                checks: [{ tone: "neutral", text: "Image Analysis disabled" }],
            };
        }

        const selectedModel = this.plugin.getOllamaVisionModel();
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
                    { tone: "danger", text: "Pulled vision models listed" },
                ],
            };
        }
        if (!this.plugin.hasPulledOllamaModel(models, selectedModel)) {
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

    async checkOllama(): Promise<HealthCheckResult> {
        if (!this.plugin.settings.aiTaggingEnabled) {
            return {
                tone: "neutral",
                value: "Off",
                message: "",
                checks: [{ tone: "neutral", text: "AI Tagging disabled" }],
            };
        }
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
        if (!this.plugin.hasPulledOllamaModel(models, selectedModel)) {
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
                { tone: "success", text: `${providerName}: ${location}` },
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
        const wrapper = containerEl.createDiv({ cls: "autotag-progress-notice autotag-processing-live-status" });
        const header = wrapper.createDiv({ cls: "autotag-progress-header" });
        header.createDiv({ cls: "autotag-progress-spinner" });
        const text = header.createDiv({ cls: "autotag-progress-text" });
        const titleEl = text.createDiv({ cls: "autotag-progress-title" });
        const subtitleEl = text.createDiv({ cls: "autotag-progress-subtitle" });

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
                const dotsEl = subtitleEl.createSpan({ cls: "autotag-loading-dots" });
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
        heading.id = `autotag-${id}`;
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
            if (heading.parentElement?.hasClass("autotag-subcategory-panel")) return;
            const parent = heading.parentElement;
            if (!parent) return;
            const panel = document.createElement("div");
            panel.addClass("autotag-subcategory-panel");
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
        clone.querySelectorAll(".autotag-info-trigger").forEach(el => el.remove());
        return clone.textContent?.trim() || "Unnamed setting";
    }

    getCleanSettingDescription(settingEl: HTMLElement): string {
        const descriptionEl = settingEl.querySelector(".setting-item-description") as HTMLElement | null;
        if (!descriptionEl) return "";
        const clone = descriptionEl.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(".autotag-info-trigger, datalist").forEach(el => el.remove());
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
        wrapper.addClass("autotag-settings-section");
        wrapper.dataset.section = "search";
        const heading = wrapper.createEl("h3", { text: "Search" });
        heading.id = "autotag-search";

        const inputSetting = new Setting(wrapper)
            .setName("Search Settings")
            .setDesc("Searches names and description text across every settings tab.");
        let searchInput: HTMLInputElement;
        const resultsEl = wrapper.createDiv({ cls: "autotag-settings-search-results autotag-settings-search-results-list" });

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
            const button = resultsEl.createEl("button", { cls: "autotag-settings-search-result" });
            button.type = "button";
            const iconEl = button.createSpan({ cls: "autotag-settings-search-result-icon" });
            setIcon(iconEl, result.sectionIcon);
            const textEl = button.createDiv({ cls: "autotag-settings-search-result-text" });
            textEl.createSpan({ text: result.name, cls: "autotag-settings-search-result-name" });
            textEl.createSpan({ text: ` - ${result.sectionLabel}`, cls: "autotag-settings-search-result-section" });
            if (descriptionExcerpt) {
                textEl.createDiv({ text: descriptionExcerpt, cls: "autotag-settings-search-result-excerpt" });
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
        const headings = Array.from(containerEl.querySelectorAll("h3[id^='autotag-']")) as HTMLElement[];
        const wrappers = new Map<string, HTMLElement>();

        headings.forEach(heading => {
            const id = heading.id.replace("autotag-", "");
            const wrapper = document.createElement("div");
            wrapper.addClass("autotag-settings-section");
            wrapper.dataset.section = id;

            let node: ChildNode | null = heading;
            while (node) {
                const next: ChildNode | null = node.nextSibling;
                wrapper.appendChild(node);
                if (next instanceof HTMLElement && next.matches("h3[id^='autotag-']")) break;
                node = next;
            }
            wrappers.set(id, wrapper);
        });

        this.moveHeadingGroup(wrappers.get("folder-tags"), wrappers.get("properties"), "Frontmatter");
        this.moveHeadingGroup(wrappers.get("qol"), wrappers.get("duplicates"), "Fix");
        this.moveSettingWithFollowingDescriptions(wrappers.get("qol"), wrappers.get("processing"), "Shutdown Protection");
        wrappers.set("search", this.createSettingsSearchSection(wrappers));
        wrappers.forEach(wrapper => this.wrapSubcategoryPanels(wrapper));
        wrappers.forEach(wrapper => this.decorateSettingsHeadings(wrapper));

        const contentEl = containerEl.createDiv({ cls: "autotag-settings-tab-content" });
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
        const bodyEls = Array.from(containerEl.querySelectorAll(".autotag-animated-section-body")) as HTMLElement[];
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

    setSettingNameWithIcon(setting: Setting, name: string, icon: string): Setting {
        const fragment = document.createDocumentFragment();
        const iconEl = document.createElement("span");
        iconEl.addClass("autotag-setting-name-icon");
        setIcon(iconEl, icon);
        fragment.appendChild(iconEl);
        const textEl = document.createElement("span");
        textEl.textContent = name;
        fragment.appendChild(textEl);
        setting.setName(fragment);
        return setting;
    }

    addCandidateModeDropdown(
        setting: Setting,
        value: CandidateMode,
        onChange: (value: CandidateMode) => Promise<void> | void
    ): Setting {
        setting.addDropdown(dropdown => dropdown
            .addOption("disabled", "Disabled")
            .addOption("consider", "Consider")
            .addOption("all", "All Keywords")
            .addOption("exclude", "Exclude")
            .setValue(value)
            .onChange(async nextValue => {
                await onChange(nextValue as CandidateMode);
            }));
        return setting;
    }

    renderAiDescriptionPropertySettings(containerEl: HTMLElement): void {
        containerEl.createEl("h4", { text: "Image Description" });
        const aiDescriptionPropertySetting = new Setting(containerEl)
            .setName("Image description property name")
            .setDesc("Property used for the AI-generated image description. Notice: Empty Fallback to Default.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getPropertyNameSuggestions());
                text.setPlaceholder(DEFAULT_SETTINGS.aiDescriptionPropertyName)
                    .setValue(this.plugin.settings.aiDescriptionPropertyName)
                    .onChange(async value => {
                        this.plugin.settings.aiDescriptionPropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.aiDescriptionPropertyName);
                        await this.plugin.saveSettings();
                    });
            });
        aiDescriptionPropertySetting.settingEl.id = "autotag-ai-description-property";
    }

    renderAiGeneratedPropertySettings(containerEl: HTMLElement, refreshAiInputSummary?: () => void): void {
        containerEl.createEl("h4", { text: "AI Tags" });

        const aiTagsPropertySetting = new Setting(containerEl)
            .setName("Tags generated by AI")
            .setDesc("Property used for AI-generated tags. Notice: Empty Fallback to Default.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiTagsPropertyEnabled)
                .onChange(async value => {
                    this.plugin.settings.aiTagsPropertyEnabled = value;
                    await this.plugin.saveSettings();
                    refreshAiInputSummary?.();
                    this.refreshDisplayAnimated();
                }))
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getPropertyNameSuggestions());
                text.setPlaceholder(DEFAULT_SETTINGS.aiTagsPropertyName)
                    .setValue(this.plugin.settings.aiTagsPropertyName)
                    .onChange(async value => {
                        this.plugin.settings.aiTagsPropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.aiTagsPropertyName);
                        await this.plugin.saveSettings();
                        if (this.plugin.settings.aiTagsUseAsVaultCandidate) this.plugin.scheduleVaultVocabularyCacheBuild();
                        refreshAiInputSummary?.();
                    });
            });
        aiTagsPropertySetting.settingEl.id = "autotag-ai-tags-property";

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

        let removeFolderWarningHostEl: HTMLElement | null = null;
        const renderRemoveFolderWarning = () => {
            if (!removeFolderWarningHostEl) return;
            removeFolderWarningHostEl.empty();
            this.renderInlineDependencyWarning(
                removeFolderWarningHostEl,
                "Folder Tags are off",
                this.plugin.settings.removeFolderTagsFromAiTags && !this.plugin.settings.useFolderTags
                    ? ["This cleanup is enabled, but Folder Tags are currently disabled. It will apply once Folder Tags are enabled."]
                    : [],
                this.getSettingsSectionIcon("folder-tags")
            );
        };
        this.setSettingNameWithIcon(
            new Setting(containerEl)
            .setDesc("Keeps Folder Tags available as AI context, but removes exact values already written by Folder Tags before writing the AI tags property.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.removeFolderTagsFromAiTags)
                .onChange(async value => {
                    this.plugin.settings.removeFolderTagsFromAiTags = value;
                    await this.plugin.saveSettings();
                    this.animateInlineDependencyWarning(removeFolderWarningHostEl!, renderRemoveFolderWarning);
                })),
            "Keep Folder Tags values out of AI Tags",
            this.getSettingsSectionIcon("folder-tags")
        );
        removeFolderWarningHostEl = containerEl.createDiv();
        renderRemoveFolderWarning();

        let removeGeoWarningHostEl: HTMLElement | null = null;
        const renderRemoveGeoWarning = () => {
            if (!removeGeoWarningHostEl) return;
            removeGeoWarningHostEl.empty();
            this.renderInlineDependencyWarning(
                removeGeoWarningHostEl,
                "Geolocation Tags are off",
                this.plugin.settings.removeGeolocationFromAiTags && !this.plugin.settings.geolocationEnabled
                    ? ["This cleanup is enabled, but Geolocation Tags are currently disabled. It will apply once Geolocation Tags are enabled."]
                    : [],
                this.getSettingsSectionIcon("geolocation")
            );
        };
        this.setSettingNameWithIcon(
            new Setting(containerEl)
            .setDesc("Keeps GPS and reverse-geocode values available as AI context, but removes matching place, landmark, address, GPS label, latitude, longitude, and coordinate terms before writing the AI tags property.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.removeGeolocationFromAiTags)
                .onChange(async value => {
                    this.plugin.settings.removeGeolocationFromAiTags = value;
                    await this.plugin.saveSettings();
                    this.animateInlineDependencyWarning(removeGeoWarningHostEl!, renderRemoveGeoWarning);
                })),
            "Keep geolocation values out of AI Tags",
            this.getSettingsSectionIcon("geolocation")
        );
        removeGeoWarningHostEl = containerEl.createDiv();
        renderRemoveGeoWarning();

        let aiTagsVaultWarningHostEl: HTMLElement | null = null;
        const renderAiTagsVaultWarning = () => {
            if (!aiTagsVaultWarningHostEl) return;
                aiTagsVaultWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    aiTagsVaultWarningHostEl,
                    "Advanced AI Tags vocabulary source",
                    this.getVaultVocabularyAdvancedWarningLines(
                        this.plugin.settings.aiTagsUseAsVaultCandidate,
                        this.plugin.settings.vaultAwarenessEnabled,
                        "ai-tags"
                    ),
                    this.getSettingsSectionIcon("vault-awareness")
                );
            };
        aiTagsVaultWarningHostEl = containerEl.createDiv();
        renderAiTagsVaultWarning();
        this.setSettingNameWithIcon(
            new Setting(containerEl)
            .setDesc("Scans the selected AI tags property across the whole vault. Every existing frontmatter value found there can become known vocabulary for Vault Awareness, not only values from the file currently being processed.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiTagsUseAsVaultCandidate)
                .onChange(async value => {
                    this.plugin.settings.aiTagsUseAsVaultCandidate = value;
                    await this.plugin.saveSettings();
                    this.plugin.scheduleVaultVocabularyCacheBuild();
                    refreshAiInputSummary?.();
                    this.animateInlineDependencyWarning(aiTagsVaultWarningHostEl!, renderAiTagsVaultWarning);
                })),
            "Use property as Vault Awareness vocabulary",
            this.getSettingsSectionIcon("vault-awareness")
        );

    }

    getCandidateModeLabel(mode: CandidateMode): string {
        if (mode === "all") return "All Keywords";
        if (mode === "consider") return "Consider";
        if (mode === "exclude") return "Exclude";
        return "Disabled";
    }

    getAiInputCandidatePills(): string[] {
        const pills: string[] = [];
        const seen = new Set<string>();
        const add = (value: string) => {
            const text = value.trim();
            const key = text.toLowerCase();
            if (!text || seen.has(key)) return;
            seen.add(key);
            pills.push(text);
        };

        if (this.plugin.settings.filenameCandidateMode !== "disabled") {
            add(`Filename: ${this.getCandidateModeLabel(this.plugin.settings.filenameCandidateMode)}`);
        }

        if (this.plugin.settings.useFolderTags) {
            this.plugin.getFolderPropertyMappings()
                .forEach(mapping => {
                    const mode = this.plugin.getFolderMappingAiCandidateMode(mapping);
                    if (mode !== "disabled") add(`Folder property: ${mapping.property} (${this.getCandidateModeLabel(mode)})`);
                });

            const fallbackMode = this.plugin.getFolderFallbackAiCandidateMode();
            if (fallbackMode !== "disabled") {
                add(`Folder fallback: ${this.plugin.normalizeFolderFallbackProperty(this.plugin.settings.folderFallbackProperty)} (${this.getCandidateModeLabel(fallbackMode)})`);
            }
        }

        if (this.plugin.settings.geolocationEnabled && this.plugin.settings.useGeolocationForAiTags) {
            add("Geolocation metadata");
        }

        if (this.plugin.settings.vaultAwarenessEnabled) {
            this.plugin.getVaultAwarenessCandidateProperties()
                .forEach(property => add(`Vault Awareness source: ${property}`));
            if (!this.plugin.settings.vaultAwarenessOutputEnabled || !this.plugin.settings.vaultAwarenessOutputExclusive) {
                add("Vault Awareness: Enabled");
            }
        }

        if (this.plugin.settings.bridgeEnabled && this.plugin.getCombinedBridgeRuleText().trim()) {
            add("Bridge: evidence-aware rules");
        }
        if (this.plugin.settings.manualEnrichmentEnabled && this.plugin.getCombinedBridgeRuleText().trim()) {
            add("Bridge: direct expansion rules");
        }

        return pills;
    }

    renderAiInputCandidatePills(containerEl: HTMLElement): void {
        containerEl.empty();
        const candidatePanelEl = containerEl.createDiv({ cls: "autotag-property-panel autotag-ai-input-candidates-panel" });
        candidatePanelEl.createEl("h5", { text: "Current AI Input Sources" });
        const pills = this.getAiInputCandidatePills();
        candidatePanelEl.createEl("p", {
            text: pills.length > 0
                ? "These configured sources can currently influence AI tagging or its final routed output."
                : "No optional AI input sources are currently active beyond the image description.",
            cls: "setting-item-description",
        });
        const listEl = candidatePanelEl.createDiv({ cls: "autotag-vault-candidate-list autotag-ai-input-candidate-list" });
        pills.forEach(pill => {
            listEl.createSpan({ text: pill, cls: "autotag-vault-candidate-chip autotag-ai-input-candidate-chip" });
        });
    }

    renderAiInputSettings(containerEl: HTMLElement): () => void {
        containerEl.createEl("h4", { text: "AI Input" });
        let summaryHostEl: HTMLElement | null = null;
        const refreshSummary = () => {
            if (summaryHostEl) this.renderAiInputCandidatePills(summaryHostEl);
        };

        const filenameCandidateSetting = new Setting(containerEl)
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
                        refreshSummary();
                    }));
        filenameCandidateSetting.settingEl.addClass("autotag-ai-tags-only");
        new Setting(containerEl)
            .setName("Only use human-readable filename text")
            .setDesc("Failsafe cleanup for filename and identifier noise. Other systems may already sort noisy names out; this additionally ignores camera names, screenshots, hashes, timestamps, counters, and mostly-number filenames before filename candidates are sent to AI, removes matching filename artifacts from returned AI tags, and strips unsupported image-code or identifier guesses from AI descriptions.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.filenameCandidatesHumanReadableOnly)
                .onChange(async value => {
                    this.plugin.settings.filenameCandidatesHumanReadableOnly = value;
                    await this.plugin.saveSettings();
                    refreshSummary();
                }));

        let geolocationAiWarningHostEl: HTMLElement | null = null;
        const renderGeolocationAiWarning = () => {
            if (!geolocationAiWarningHostEl) return;
            geolocationAiWarningHostEl.empty();
            this.renderInlineDependencyWarning(
                geolocationAiWarningHostEl,
                "Geolocation Tags are off",
                (this.plugin.settings.useGeolocationForAiTags || this.plugin.settings.useGeolocationForAiDescription) && !this.plugin.settings.geolocationEnabled
                    ? ["This AI context source is enabled, but Geolocation Tags are currently disabled."]
                    : [],
                this.getSettingsSectionIcon("geolocation")
            );
        };
        this.setSettingNameWithIcon(
            new Setting(containerEl)
            .setDesc("Sends known GPS and reverse-geocode metadata to AI descriptions and AI tags so location claims are based on real metadata instead of guesses from image style or filename.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useGeolocationForAiTags && this.plugin.settings.useGeolocationForAiDescription)
                .onChange(async value => {
                    this.plugin.settings.useGeolocationForAiTags = value;
                    this.plugin.settings.useGeolocationForAiDescription = value;
                    await this.plugin.saveSettings();
                    refreshSummary();
                    this.animateInlineDependencyWarning(geolocationAiWarningHostEl!, renderGeolocationAiWarning);
                })),
            "Use geolocation as AI context",
            this.getSettingsSectionIcon("geolocation")
        );
        geolocationAiWarningHostEl = containerEl.createDiv();
        renderGeolocationAiWarning();

        summaryHostEl = containerEl.createDiv({ cls: "autotag-ai-tags-only" });
        refreshSummary();
        return refreshSummary;
    }

    renderAiEnabledSettings(
        containerEl: HTMLElement,
        showDescriptionSettings: boolean,
        showAiTagSettings: boolean
    ): { update: (showDescription: boolean, showAiTags: boolean) => void } {
        containerEl.empty();
        const aiBodyEl = this.createSettingsRevealContainer(containerEl);
        aiBodyEl.createEl("h4", { text: "AI Setup" });

        new Setting(aiBodyEl)
            .setName("Get Ollama")
            .setDesc("Required for local image analysis and AI tagging. Install Ollama before pulling or using local models.")
            .addButton(button => {
                button
                    .setButtonText("Download Ollama")
                    .onClick(() => {
                        window.open("https://ollama.com/download");
                    });
                button.buttonEl.addClass("autotag-success-button");
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

        aiBodyEl.createEl("h4", { text: "Vision Model" });

        const visionModelSetting = new Setting(aiBodyEl)
            .setName("Ollama Vision Model")
            .setDesc("Local vision model used to read the image and create the initial description.");

        let refreshVisionModelDropdown: (() => Promise<void>) | null = null;

        visionModelSetting.addDropdown(dropdown => {
            refreshVisionModelDropdown = async () => {
                const pulledModels = await this.plugin.listPulledOllamaModels();

                dropdown.selectEl.empty();

                RECOMMENDED_VISION_MODELS.forEach(model => {
                    const suffix = this.plugin.hasPulledOllamaModel(pulledModels, model.name) ? " [Pulled]" : "";
                    dropdown.addOption(model.name, `${model.label}${suffix}`);
                });

                pulledModels
                    .filter(model => !RECOMMENDED_VISION_MODELS.some(recommended => this.plugin.normalizeOllamaModelNameForCompare(recommended.name) === this.plugin.normalizeOllamaModelNameForCompare(model)))
                    .forEach(model => dropdown.addOption(model, `${model} [Pulled]`));

                const selectedModel = this.plugin.getOllamaVisionModel();
                if (!Array.from(dropdown.selectEl.options).some(option => option.value === selectedModel)) {
                    dropdown.addOption(selectedModel, `${selectedModel} [Custom]`);
                }
                dropdown.setValue(selectedModel);
            };

            RECOMMENDED_VISION_MODELS.forEach(model => {
                dropdown.addOption(model.name, model.label);
            });

            dropdown
                .setValue(this.plugin.getOllamaVisionModel())
                .onChange(async (value) => {
                    this.plugin.settings.ollamaVisionModel = value;
                    await this.plugin.saveSettings();
                });

            void refreshVisionModelDropdown();
        });

        new Setting(aiBodyEl)
            .setName("Pull Vision Model")
            .setDesc("Downloads the selected vision model with Ollama so Image Analysis can run locally.")
            .addButton(button => {
                button
                    .setButtonText("Pull Model")
                    .setCta()
                    .onClick(async () => {
                        const modelName = this.plugin.getOllamaVisionModel();
                        button.setButtonText("Pulling...");
                        button.setDisabled(true);

                        const pulled = await this.plugin.pullOllamaModel(modelName);

                        button.setDisabled(false);
                        button.setButtonText("Pull Model");

                        if (pulled) {
                            new Notice(`Pulled Ollama vision model: ${modelName}`);
                            await refreshVisionModelDropdown?.();
                        } else {
                            new Notice("Could not pull vision model. Check that Ollama is installed and running.");
                        }
                    });
            });

        new Setting(aiBodyEl)
            .setName("Remove Selected Vision Model")
            .setDesc("Deletes the selected vision model from local Ollama storage.")
            .addButton(button => {
                const removeSelectedModel = async () => {
                    const modelName = this.plugin.getOllamaVisionModel();
                    button.setButtonText("Removing...");
                    button.setDisabled(true);

                    const removed = await this.plugin.removeOllamaModel(modelName);

                    button.setDisabled(false);
                    button.setButtonText("Remove Model");

                    if (removed) {
                        new Notice(`Removed Ollama vision model: ${modelName}`);
                        await refreshVisionModelDropdown?.();
                    } else {
                        new Notice("Could not remove vision model. Check that Ollama is running and the model is pulled.");
                    }
                };

                button
                    .setButtonText("Remove Model")
                    .onClick(() => {
                        const modelName = this.plugin.getOllamaVisionModel();
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Remove selected Ollama vision model?",
                            `This deletes '${modelName}' from local Ollama storage. It does not change existing notes.`,
                            "Remove Model",
                            removeSelectedModel
                        ).open();
                    });
                button.buttonEl.addClass("autotag-danger-button");
            });

        new Setting(aiBodyEl)
            .setName("Custom Vision Model")
            .setDesc("Optional: type a local Ollama vision model name not listed above, for example a custom Modelfile name.")
            .addText(text =>
                text.setPlaceholder("my-vision-model")
                    .setValue("")
                    .onChange(async (value) => {
                        const modelName = value.trim();
                        if (modelName) {
                            this.plugin.settings.ollamaVisionModel = modelName;
                            await this.plugin.saveSettings();
                            await refreshVisionModelDropdown?.();
                        }
                    }));

        new Setting(aiBodyEl)
            .setName("Image Description Prompt")
            .setDesc("Prompt sent to the selected vision model before geolocation enhancement, human-readable cleanup, folder filtering, and AI tag generation run.")
            .addTextArea(textArea => {
                textArea.inputEl.rows = 5;
                textArea.setPlaceholder(DEFAULT_OLLAMA_VISION_PROMPT)
                    .setValue(this.plugin.getOllamaVisionPrompt())
                    .onChange(async value => {
                        this.plugin.settings.ollamaVisionPrompt = value.trim() || DEFAULT_OLLAMA_VISION_PROMPT;
                        await this.plugin.saveSettings();
                    });
            })
            .addButton(button => button
                .setButtonText("Reset Prompt")
                .onClick(async () => {
                    this.plugin.settings.ollamaVisionPrompt = DEFAULT_OLLAMA_VISION_PROMPT;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));

        new Setting(aiBodyEl)
            .setName("Minimum AI description words")
            .setDesc("Requested minimum length for the generated image description. Responses below this count trigger a stricter vision-model retry; if the model still stops early, Autotag keeps the longest factual response instead of discarding it.")
            .addSlider(slider => slider
                .setLimits(20, 500, 10)
                .setValue(this.plugin.settings.aiDescriptionMinimumWords)
                .setDynamicTooltip()
                .onChange(async value => {
                    this.plugin.settings.aiDescriptionMinimumWords = value;
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setIcon("rotate-ccw")
                .setTooltip("Reset to default")
                .onClick(async () => {
                    this.plugin.settings.aiDescriptionMinimumWords = DEFAULT_SETTINGS.aiDescriptionMinimumWords;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));
        aiBodyEl.createEl("h4", { text: "Tag Model" });

        const modelSetting = new Setting(aiBodyEl)
            .setName("Ollama Tag Model")
            .setDesc("Local model used for semantic enrichment.");

        let refreshModelDropdown: (() => Promise<void>) | null = null;

        modelSetting.addDropdown(dropdown => {
            refreshModelDropdown = async () => {
                const pulledModels = await this.plugin.listPulledOllamaModels();

                dropdown.selectEl.empty();

                RECOMMENDED_TAGGING_MODELS.forEach(model => {
                    const suffix = this.plugin.hasPulledOllamaModel(pulledModels, model.name) ? " [Pulled]" : "";
                    dropdown.addOption(model.name, `${model.label}${suffix}`);
                });

                pulledModels
                    .filter(model => !RECOMMENDED_TAGGING_MODELS.some(recommended => this.plugin.normalizeOllamaModelNameForCompare(recommended.name) === this.plugin.normalizeOllamaModelNameForCompare(model)))
                    .forEach(model => dropdown.addOption(model, `${model} [Pulled]`));

                const selectedModel = this.plugin.settings.ollamaModel || DEFAULT_SETTINGS.ollamaModel;
                if (!Array.from(dropdown.selectEl.options).some(option => option.value === selectedModel)) {
                    dropdown.addOption(selectedModel, `${selectedModel} [Custom]`);
                }
                dropdown.setValue(selectedModel);
            };

            RECOMMENDED_TAGGING_MODELS.forEach(model => {
                dropdown.addOption(model.name, model.label);
            });

            dropdown
                .setValue(this.plugin.settings.ollamaModel || DEFAULT_SETTINGS.ollamaModel)
                .onChange(async (value) => {
                    this.plugin.settings.ollamaModel = value;
                    await this.plugin.saveSettings();
                });

            void refreshModelDropdown();
        });

        new Setting(aiBodyEl)
            .setName("Pull Tag Model")
            .setDesc("Downloads the selected tag model with Ollama so semantic enrichment can run locally.")
            .addButton(button => {
                button
                    .setButtonText("Pull Model")
                    .setCta()
                    .onClick(async () => {
                        const modelName = this.plugin.settings.ollamaModel || DEFAULT_SETTINGS.ollamaModel;
                        button.setButtonText("Pulling...");
                        button.setDisabled(true);

                        const pulled = await this.plugin.pullOllamaModel(modelName);

                        button.setDisabled(false);
                        button.setButtonText("Pull Model");

                        if (pulled) {
                            new Notice(`Pulled Ollama tag model: ${modelName}`);
                            await refreshModelDropdown?.();
                        } else {
                            new Notice("Could not pull tag model. Check that Ollama is installed and running.");
                        }
                    });
            });

        new Setting(aiBodyEl)
            .setName("Remove Selected Tag Model")
            .setDesc("Deletes the selected tag model from local Ollama storage.")
            .addButton(button => {
                const removeSelectedModel = async () => {
                    const modelName = this.plugin.settings.ollamaModel || DEFAULT_SETTINGS.ollamaModel;
                    button.setButtonText("Removing...");
                    button.setDisabled(true);

                    const removed = await this.plugin.removeOllamaModel(modelName);

                    button.setDisabled(false);
                    button.setButtonText("Remove Model");

                    if (removed) {
                        new Notice(`Removed Ollama tag model: ${modelName}`);
                        await refreshModelDropdown?.();
                    } else {
                        new Notice("Could not remove tag model. Check that Ollama is running and the model is pulled.");
                    }
                };

                button
                    .setButtonText("Remove Model")
                    .onClick(() => {
                        const modelName = this.plugin.settings.ollamaModel || DEFAULT_SETTINGS.ollamaModel;
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Remove selected Ollama tag model?",
                            `This deletes '${modelName}' from local Ollama storage. It does not change existing notes.`,
                            "Remove Model",
                            removeSelectedModel
                        ).open();
                    });
                button.buttonEl.addClass("autotag-danger-button");
            });

        new Setting(aiBodyEl)
            .setName("Custom Tag Model")
            .setDesc("Optional: type a local Ollama tag model name not listed above, for example a custom Modelfile name.")
            .addText(text =>
                text.setPlaceholder("my-custom-model")
                    .setValue("")
                    .onChange(async (value) => {
                        const modelName = value.trim();
                        if (modelName) {
                            this.plugin.settings.ollamaModel = modelName;
                            await this.plugin.saveSettings();
                            await refreshModelDropdown?.();
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
        const refreshAiInputSummary = this.renderAiInputSettings(aiBodyEl);
        this.renderAiDescriptionPropertySettings(aiBodyEl);
        this.renderAiGeneratedPropertySettings(aiBodyEl, refreshAiInputSummary);
        this.wrapSubcategoryPanels(aiBodyEl);
        this.decorateSettingsHeadings(aiBodyEl);
        this.enhanceInfoDescriptionAnimations(aiBodyEl);

        type ConditionalAiSection = {
            hostEl: HTMLElement;
            contentEl: HTMLElement;
            visible: boolean;
        };
        const findPanel = (headingText: string): HTMLElement | null => {
            const heading = (Array.from(aiBodyEl.querySelectorAll("h4")) as HTMLElement[])
                .find(candidate => candidate.textContent?.trim() === headingText);
            return heading?.closest(".autotag-subcategory-panel") as HTMLElement | null;
        };
        const createConditionalSection = (contentEl: HTMLElement | null, visible: boolean): ConditionalAiSection | null => {
            const parentEl = contentEl?.parentElement;
            if (!contentEl || !parentEl) return null;
            const hostEl = document.createElement("div");
            hostEl.addClass("autotag-ai-conditional-host");
            parentEl.insertBefore(hostEl, contentEl);
            hostEl.appendChild(contentEl);
            if (!visible) contentEl.remove();
            return { hostEl, contentEl, visible };
        };
        const setConditionalSectionVisible = (section: ConditionalAiSection | null, visible: boolean): void => {
            if (!section || section.visible === visible) return;
            section.visible = visible;
            const render = () => {
                section.hostEl.empty();
                if (visible) section.hostEl.appendChild(section.contentEl);
            };
            if (visible) {
                this.animateSettingsContent(section.hostEl, render);
            } else {
                this.animateSettingsCollapseThenRender(section.hostEl, render);
            }
        };

        const visionSection = createConditionalSection(findPanel("Vision Model"), showDescriptionSettings);
        const descriptionSection = createConditionalSection(findPanel("Image Description"), showDescriptionSettings);
        const tagModelSection = createConditionalSection(findPanel("Tag Model"), showAiTagSettings);
        const aiTagsSection = createConditionalSection(findPanel("AI Tags"), showAiTagSettings);
        const aiTagInputSections = (Array.from(aiBodyEl.querySelectorAll(".autotag-ai-tags-only")) as HTMLElement[])
            .map(element => createConditionalSection(element, showAiTagSettings))
            .filter((section): section is ConditionalAiSection => section !== null);

        return {
            update: (showDescription: boolean, showAiTags: boolean) => {
                setConditionalSectionVisible(visionSection, showDescription);
                setConditionalSectionVisible(descriptionSection, showDescription);
                setConditionalSectionVisible(tagModelSection, showAiTags);
                setConditionalSectionVisible(aiTagsSection, showAiTags);
                aiTagInputSections.forEach(section => setConditionalSectionVisible(section, showAiTags));
            },
        };
    }
    enhanceInfoDescriptionAnimations(containerEl: HTMLElement): void {
        const settingEls = Array.from(containerEl.querySelectorAll(".setting-item")) as HTMLElement[];
        settingEls.forEach(settingEl => {
            const nameEl = settingEl.querySelector(".setting-item-name") as HTMLElement | null;
            const descriptionEl = settingEl.querySelector(".setting-item-description") as HTMLElement | null;
            if (!nameEl || !descriptionEl || nameEl.querySelector(".autotag-info-trigger")) return;

            const infoEl = nameEl.createSpan({ cls: "autotag-info-trigger", text: "i" });
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
                    .map(el => (el as any).__autotagInfoController)
                    .filter(Boolean);
                controllers.forEach(controller => {
                    if (controller.settingEl !== settingEl) controller.close();
                });
            };

            const animateTo = (open: boolean) => {
                if (isAnimating || isOpen === open) return;
                isAnimating = true;
                descriptionEl.addClass("autotag-info-managed");
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

            (settingEl as any).__autotagInfoController = {
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
        this.plugin.scheduleVaultVocabularyCacheBuild();
        const { containerEl } = this;
        this.closeInfoDescriptions(containerEl);
        this.resetInfoScrollCloseHandlers();
        this.resetProcessingStatusTimer();
        this.resetHealthDashboardTimer();
        containerEl.empty();
        containerEl.addClass("autotag-settings-tab");

        containerEl.createEl('h2', { text: 'Autotag Settings' });
        this.renderSettingsNavigation(containerEl);
        this.createSettingsAnchor(containerEl, "health", "Health");
        this.renderHealthCheckupSettings(containerEl);

        this.createSettingsAnchor(containerEl, "setup", "Setup");
        this.renderHowItWorksPanel(
            containerEl,
            "How it works",
            "Choose a source folder and companion-note folder. Autotag creates or updates companion notes, then applies the enabled tag systems in the order shown here in the settings."
        );
        containerEl.createEl("h4", { text: "Path Setup" });
        this.renderProblemWarningPanel(
            containerEl,
            "autotag-setup-path-warning",
            "Setup path attention",
            this.getSetupProblemWarningLines(),
            "warning",
            "Autotag needs the source and companion-note folders before processing can run reliably."
        );

        // Base path
        new Setting(containerEl)
            .setName("Base Path for Watched Files")
            .setDesc("Managed source folder for files Autotag should process. Notice: Empty Fallback to Default.")
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

        new Setting(containerEl)
            .setName("Move outside files into Base Path")
            .setDesc("When a supported non-markdown file is added outside the managed source folder, move it into the Base Path before processing. Files already inside the Base Path, companion notes, hidden folders, and node_modules are left alone.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.moveOutsideFilesToBasePath)
                .onChange(async value => {
                    this.plugin.settings.moveOutsideFilesToBasePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Companion Note Folder")
            .setDesc("Folder where Autotag creates and looks for companion notes. Notice: Empty fallback to default.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.getFolderPathSuggestions());
                text.setPlaceholder(DEFAULT_SETTINGS.companionNoteFolder)
                    .setValue(this.plugin.settings.companionNoteFolder)
                    .onChange(async value => {
                        this.plugin.settings.companionNoteFolder = this.plugin.normalizeVaultFolderPath(value) || DEFAULT_SETTINGS.companionNoteFolder;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Companion Note Name Format")
            .setDesc("Format for generated companion note names. Supported tokens: {{name}} name without extension, {{filename}} name with extension, {{extension}}, {{path}}, {{link}}, and {{embed}}. Casing only changes name, filename, and extension tokens: uppercase tokens like {{NAME}} write uppercase, title-style tokens like {{Name}} keep the original upper/lowercase text, and lowercase tokens write lowercase. Path, link, and embed tokens always keep the real vault path casing so links stay valid.")
            .addText(text => text
                .setPlaceholder(DEFAULT_SETTINGS.companionNoteNameFormat)
                .setValue(this.plugin.settings.companionNoteNameFormat)
                .onChange(async value => {
                    this.plugin.settings.companionNoteNameFormat = value.trim() || DEFAULT_SETTINGS.companionNoteNameFormat;
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

        const linkToFilePropertySetting = new Setting(containerEl)
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
        linkToFilePropertySetting.settingEl.id = "autotag-property-link-to-file";

        const fileTypePropertySetting = new Setting(containerEl)
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
        fileTypePropertySetting.settingEl.id = "autotag-property-file-type";

        const embedPropertySetting = new Setting(containerEl)
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
        embedPropertySetting.settingEl.id = "autotag-property-embed";

        const detectedProperties = this.getDetectedFrontmatterProperties();

        this.createSettingsAnchor(containerEl, "folder-tags", "Folder Tags");
        const folderTagsHowHostEl = containerEl.createDiv();
        const renderFolderTagsHow = () => {
            folderTagsHowHostEl.empty();
            if (this.plugin.settings.useFolderTags) return;
            this.renderHowItWorksPanel(
                folderTagsHowHostEl,
                "How Folder Tags work",
                "Dropping a file into the Base Path adds properties based on Folder Properties, with tags based on subfolder names. Example: a file inside Anime/Character can write Anime and Character. Each Folder Property can also choose how its values influence AI Tags."
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
            const fallbackPanelEl = folderTagsBodyEl.createDiv({ cls: "autotag-property-panel" });
            fallbackPanelEl.createEl("h5", { text: "Folder Fallback" });
            const fallbackPropertySetting = new Setting(fallbackPanelEl)
                .setName("Folder Fallback Property")
                .setDesc("Where folder names go when they are not listed above. Type any property name or choose a searchable suggestion from the active template, detected vault properties, and plugin properties. Notice: Empty Fallback to Default.")
                .addText(text => {
                    this.attachTextSuggestions(text.inputEl, this.getPropertyNameSuggestions(detectedProperties));
                    text.setPlaceholder(DEFAULT_SETTINGS.folderFallbackProperty)
                        .setValue(this.plugin.settings.folderFallbackProperty)
                        .onChange(async value => {
                            this.plugin.settings.folderFallbackProperty = this.plugin.normalizeFolderFallbackProperty(value);
                            await this.plugin.saveSettings();
                            if (this.plugin.settings.folderFallbackUseAsVaultCandidate) this.plugin.scheduleVaultVocabularyCacheBuild();
                        });
                });
            fallbackPropertySetting.settingEl.id = "autotag-folder-fallback-property";

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

            let fallbackAiWarningHostEl: HTMLElement | null = null;
            const renderFallbackAiWarning = () => {
                if (!fallbackAiWarningHostEl) return;
                fallbackAiWarningHostEl.empty();
                const mode = this.plugin.getFolderFallbackAiCandidateMode();
                this.renderInlineDependencyWarning(
                    fallbackAiWarningHostEl,
                    "AI Tagging is off",
                    this.plugin.isCandidateSourceActive(mode) && !this.plugin.settings.aiTaggingEnabled
                        ? ["The folder fallback is set to feed AI Tags, but AI Tagging is currently disabled. Enable AI Tags or set this mode to Disabled."]
                        : [],
                    this.getSettingsSectionIcon("ai-tags")
                );
            };
            this.setSettingNameWithIcon(
                this.addCandidateModeDropdown(
                    new Setting(fallbackPanelEl)
                        .setDesc("Controls how unmatched folder names written to the fallback property can influence AI Tags. All Keywords lets the value act as metadata evidence, Consider uses it only as a weak clue, Exclude keeps exact fallback values out of AI Tags, and Disabled ignores it for AI."),
                    this.plugin.getFolderFallbackAiCandidateMode(),
                    async value => {
                        this.plugin.settings.folderFallbackAiCandidateMode = value;
                        this.plugin.settings.folderFallbackUseAsAiCandidate = this.plugin.isCandidateSourceActive(value);
                        await this.plugin.saveSettings();
                        this.animateInlineDependencyWarning(fallbackAiWarningHostEl!, renderFallbackAiWarning);
                    }
                ),
                "Fallback AI candidate mode",
                this.getSettingsSectionIcon("ai-tags")
            );
            fallbackAiWarningHostEl = fallbackPanelEl.createDiv();
            renderFallbackAiWarning();

            let fallbackVaultWarningHostEl: HTMLElement | null = null;
            const renderFallbackVaultWarning = () => {
                if (!fallbackVaultWarningHostEl) return;
                fallbackVaultWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    fallbackVaultWarningHostEl,
                    "Advanced vocabulary source",
                    this.getVaultVocabularyAdvancedWarningLines(
                        this.plugin.settings.folderFallbackUseAsVaultCandidate,
                        this.plugin.settings.vaultAwarenessEnabled,
                        "fallback"
                    ),
                    this.getSettingsSectionIcon("vault-awareness")
                );
            };
            fallbackVaultWarningHostEl = fallbackPanelEl.createDiv();
            renderFallbackVaultWarning();
            this.setSettingNameWithIcon(
                new Setting(fallbackPanelEl)
                    .setDesc("Scans the fallback property across the whole vault. Every existing frontmatter value found there can become known vocabulary for Vault Awareness, not only values from the file currently being processed.")
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.folderFallbackUseAsVaultCandidate)
                        .onChange(async value => {
                            this.plugin.settings.folderFallbackUseAsVaultCandidate = value;
                            await this.plugin.saveSettings();
                            this.plugin.scheduleVaultVocabularyCacheBuild();
                            this.animateInlineDependencyWarning(fallbackVaultWarningHostEl!, renderFallbackVaultWarning);
                        })),
                "Use property as Vault Awareness vocabulary",
                this.getSettingsSectionIcon("vault-awareness")
            );

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
            .setDesc("Choose whether Autotag builds companion notes from the internal template or reads a vault template file. Generated properties overwrite their template values, while other template fields and body text are preserved.")
            .addDropdown(dropdown => dropdown
                .addOption("internal", "Use Internal Template")
                .addOption("template-file", "Use Template File")
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
                    .setDesc("Paste a valid frontmatter template from one of your notes. Generated properties such as link-to-file, file type, embed, AI tags, and the AI description property overwrite their template values. Property-list values and extra template properties are additive/preserved, so examples like types: with - Ata or tags: with - excalidraw can stay in the template.");
                frontmatterTemplateSetting.settingEl.addClass("autotag-frontmatter-template-setting");
                templatePropertySuggestionHostEl = frontmatterTemplateSetting.infoEl.createDiv({ cls: "autotag-template-suggestion-host" });
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
                let templateStatusEl: HTMLElement;
                const refreshTemplateStatus = () => {
                    const templatePath = this.plugin.getTemplateFilePath();
                    const unavailableMessage = this.plugin.getTemplateFileUnavailableMessage();
                    templateStatusEl.setText(unavailableMessage
                        ? `${unavailableMessage} Template checks and the generated preview are unavailable until you choose an existing Markdown template.`
                        : `Template check uses: ${templatePath}`);
                };
                new Setting(templateSourceHostEl)
                    .setName("Template File Path")
                    .setDesc("Vault-relative Markdown file used as the base companion-note template. Autotag reads its frontmatter for checks, preserves non-generated fields, and keeps body text.")
                    .addText(text => {
                        this.attachTextSuggestions(text.inputEl, this.app.vault.getMarkdownFiles().map(file => file.path));
                        text.setPlaceholder("Tools/Templates/Companion.md")
                            .setValue(this.plugin.settings.templateFilePath)
                            .onChange(async value => {
                                this.plugin.settings.templateFilePath = this.plugin.normalizeVaultPath(value);
                                await this.plugin.saveSettings();
                                refreshTemplateStatus();
                                refreshTemplatePropertySuggestions();
                                refreshGeneratedMarkdownPreview();
                            });
                    });
                templateStatusEl = templateSourceHostEl.createEl("p", {
                    cls: "setting-item-description",
                });
                refreshTemplateStatus();
                templatePropertySuggestionHostEl = templateSourceHostEl.createDiv({ cls: "autotag-template-suggestion-host" });
                this.renderTemplatePropertySuggestionBox(templatePropertySuggestionHostEl);
            }
            this.enhanceInfoDescriptionAnimations(templateSourceHostEl);
        };
        renderTemplateSourceSettings();
        this.forceSettingsBodyOpen(templateSourceHostEl);

        generatedMarkdownPreviewHostEl = containerEl.createDiv();
        this.renderGeneratedMarkdownPreview(generatedMarkdownPreviewHostEl);

        const generatedMarkdownPreviewRefs = this.getGeneratedMarkdownPreviewRefs(generatedMarkdownPreviewHostEl);
        new Setting(generatedMarkdownPreviewRefs.embedSettingHostEl)
            .setName("Paste image embed into note body")
            .setDesc("Adds the image embed below the frontmatter as ![[image]].")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.writeImageEmbedInBody)
                .onChange(async value => {
                    this.plugin.settings.writeImageEmbedInBody = value;
                    await this.plugin.saveSettings();
                    refreshGeneratedMarkdownPreview();
                }));

        this.renderGeolocationSettings(containerEl);

        this.createSettingsAnchor(containerEl, 'processing', 'Processing & Queue');

        containerEl.createEl("h4", { text: "Processing Setup" });

        new Setting(containerEl)
            .setName("Companion note creation retries")
            .setDesc("Extra attempts after the first companion-note creation attempt if Obsidian does not confirm the note exists. The wait before each retry follows the First retry wait schedule below.")
            .addSlider(slider => slider
                .setLimits(0, 5, 1)
                .setValue(this.plugin.settings.companionNoteCreationRetries)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.companionNoteCreationRetries = value;
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setIcon("rotate-ccw")
                .setTooltip("Reset to default")
                .onClick(async () => {
                    this.plugin.settings.companionNoteCreationRetries = DEFAULT_SETTINGS.companionNoteCreationRetries;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));

        new Setting(containerEl)
            .setName("First retry wait")
            .setDesc("Seconds to wait before the first retry. Every subsequent retry adds 100% of this original interval: with a 2-second wait, three retries run after 2, 4, and 6 seconds. Applies to companion-note creation and complete file-processing retries.")
            .addSlider(slider => slider
                .setLimits(1, 30, 1)
                .setValue(this.plugin.settings.retryInitialWaitSeconds)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.retryInitialWaitSeconds = value;
                    await this.plugin.saveSettings();
                }))
            .addButton(button => button
                .setIcon("rotate-ccw")
                .setTooltip("Reset to default")
                .onClick(async () => {
                    this.plugin.settings.retryInitialWaitSeconds = DEFAULT_SETTINGS.retryInitialWaitSeconds;
                    await this.plugin.saveSettings();
                    this.refreshDisplayAnimated();
                }));

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

        this.createSettingsAnchor(containerEl, 'vault-awareness', 'Vault Awareness');
        let refreshBridgeDependencies: () => void = () => undefined;
        const vaultHowHostEl = containerEl.createDiv();
        const renderVaultHow = () => {
            vaultHowHostEl.empty();
            if (this.plugin.settings.vaultAwarenessEnabled) return;
            this.renderHowItWorksPanel(
                vaultHowHostEl,
                "How Vault Awareness works",
                "When enabled, Autotag indexes configured frontmatter vocabulary before processing. Exact, alias, learned, structural, and semantic matching are configured under Bridge > Self-learning Bridge; recognized existing values can then be written through the Vault Awareness output."
            );
        };
        renderVaultHow();

        let vaultToggleWarningHostEl: HTMLElement | null = null;
        const renderVaultToggleWarning = () => {
            if (!vaultToggleWarningHostEl) return;
            vaultToggleWarningHostEl.empty();
            this.renderInlineDependencyWarning(
                vaultToggleWarningHostEl,
                "AI Tagging is off",
                this.getVaultAwarenessProblemWarningLines(),
                this.getSettingsSectionIcon("ai-tags")
            );
        };
        this.setSettingNameWithIcon(
            new Setting(containerEl)
            .setDesc("Indexes configured vault vocabulary before processing and enhances AI output with fitting existing values. Exact, alias, learned, structural, and semantic matching are configured under Bridge > Self-learning Bridge. Requires AI Tagging via Ollama.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.vaultAwarenessEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.vaultAwarenessEnabled = value;
                    await this.plugin.saveSettings();
                    this.plugin.scheduleVaultVocabularyCacheBuild();
                    if (value) {
                        this.animateSettingsCollapseThenRender(vaultHowHostEl, renderVaultHow);
                        this.animateSettingsContent(vaultHostEl, renderVaultEnabled);
                    } else {
                        this.animateSettingsContent(vaultHowHostEl, renderVaultHow);
                        this.animateSettingsCollapseThenRender(vaultHostEl, renderVaultEnabled);
                    }
                    this.animateInlineDependencyWarning(vaultToggleWarningHostEl!, renderVaultToggleWarning);
                    refreshBridgeDependencies();
                })),
            "Enable Vault Awareness",
            this.getSettingsSectionIcon("ai-tags")
        );
        vaultToggleWarningHostEl = containerEl.createDiv();
        renderVaultToggleWarning();

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
            vaultBodyEl.createEl("h4", { text: "Vault Awareness Candidates" });
            const candidatePanelEl = vaultBodyEl.createDiv({ cls: "autotag-property-panel autotag-vault-candidates-panel" });
            candidatePanelEl.createEl("h5", { text: "Vocabulary Sources" });
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
                        this.plugin.scheduleVaultVocabularyCacheBuild();
                    });
                });

            const candidateProperties = this.plugin.getVaultAwarenessCandidateProperties();
            candidatePanelEl.createEl("p", {
                text: candidateProperties.length > 0
                    ? "Properties currently scanned across the whole vault as Vault Awareness vocabulary sources. All existing frontmatter values in these properties can become candidates:"
                    : "No properties are currently used as Vault Awareness vocabulary sources. Enable the Vault Awareness vocabulary toggles under Folder Tags or Tags generated by AI to scan those properties across the whole vault.",
                cls: "setting-item-description",
            });
            const candidateListEl = candidatePanelEl.createDiv({ cls: "autotag-vault-candidate-list" });
            candidateProperties.forEach(property => {
                candidateListEl.createSpan({ text: property, cls: "autotag-vault-candidate-chip" });
            });
            if (this.plugin.settings.bridgeEnabled && this.plugin.settings.bridgeUsePreBridgeVaultAwarenessOutput) {
                candidateListEl.createSpan({ text: "Setting: Pre-Bridge", cls: "autotag-vault-candidate-chip autotag-vault-candidate-chip-setting" });
            }

            vaultBodyEl.createEl("h4", { text: "Vault Awareness Output" });
            const outputPanelEl = vaultBodyEl.createDiv({ cls: "autotag-property-panel autotag-vault-output-panel" });
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

                const outputPropertySetting = new Setting(outputFieldsEl)
                    .setName("Vault Awareness Tags Property")
                    .setDesc("Property that receives recognized Vault Awareness tags when separate output is enabled. Type any property name or choose a searchable suggestion from the active template, detected vault properties, and plugin properties.")
                    .addText(text => {
                        this.attachTextSuggestions(text.inputEl, this.getPropertyNameSuggestions());
                        text.setPlaceholder(DEFAULT_SETTINGS.vaultAwarenessOutputPropertyName)
                            .setValue(this.plugin.settings.vaultAwarenessOutputPropertyName)
                            .onChange(async value => {
                                this.plugin.settings.vaultAwarenessOutputPropertyName = this.plugin.normalizePropertyName(value, DEFAULT_SETTINGS.vaultAwarenessOutputPropertyName);
                                await this.plugin.saveSettings();
                            });
                    });
                outputPropertySetting.settingEl.id = "autotag-vault-awareness-output-property";

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
        this.renderProblemWarningPanel(
            containerEl,
            "autotag-image-analysis-warning",
            "Image Analysis attention",
            this.plugin.settings.aiDescriptionPropertyEnabled || this.plugin.settings.aiTaggingEnabled
                ? this.getImageAnalysisProblemWarningLines()
                : [],
            "warning",
            "Image Analysis uses the selected local Ollama vision model to create the visual description that AI tags and AI descriptions build on."
        );
        this.renderProblemWarningPanel(
            containerEl,
            "autotag-ai-ollama-warning",
            "Tag model attention",
            this.plugin.settings.aiTaggingEnabled ? this.getOllamaProblemWarningLines() : [],
            "warning",
            "Ollama must be reachable and the selected model must be installed before local AI tagging can add semantic tags."
        );
        const isAnyAiOutputEnabled = () => this.plugin.settings.aiDescriptionPropertyEnabled
            || this.plugin.settings.aiTaggingEnabled;
        const aiHowHostEl = containerEl.createDiv();
        const renderAiHow = () => {
            aiHowHostEl.empty();
            if (isAnyAiOutputEnabled()) return;
            this.renderHowItWorksPanel(
                aiHowHostEl,
                "How local AI works",
                "AI Description uses a local vision model to describe visible image content. AI Tags can then use that description together with enabled metadata inputs to write semantic tags. Either feature can be used independently, while enabling both runs them in that order."
            );
            this.renderSoftWarningPanel(
                aiHowHostEl,
                "Local AI can take longer",
                "Using local vision or tagging models can significantly increase file generation time, potentially up to 1 minute per file depending on your computer and selected models."
            );
        };
        renderAiHow();

        const aiEnabledHostEl = containerEl.createDiv({ cls: "autotag-ai-enabled-host" });
        let aiSectionsController: { update: (showDescription: boolean, showAiTags: boolean) => void } | null = null;
        const renderAiEnabled = () => {
            aiEnabledHostEl.empty();
            aiSectionsController = null;
            if (!isAnyAiOutputEnabled()) return;
            aiSectionsController = this.renderAiEnabledSettings(
                aiEnabledHostEl,
                this.plugin.settings.aiDescriptionPropertyEnabled,
                this.plugin.settings.aiTaggingEnabled
            );
            this.enhanceInfoDescriptionAnimations(aiEnabledHostEl);
        };
        const updateAiFeatureVisibility = (wasAnyEnabled: boolean) => {
            const isAnyEnabled = isAnyAiOutputEnabled();
            if (wasAnyEnabled !== isAnyEnabled) {
                if (isAnyEnabled) {
                    this.animateSettingsCollapseThenRender(aiHowHostEl, renderAiHow);
                    this.animateSettingsContent(aiEnabledHostEl, renderAiEnabled);
                } else {
                    this.animateSettingsContent(aiHowHostEl, renderAiHow);
                    this.animateSettingsCollapseThenRender(aiEnabledHostEl, renderAiEnabled);
                }
                return;
            }
            aiSectionsController?.update(
                this.plugin.settings.aiDescriptionPropertyEnabled,
                this.plugin.settings.aiTaggingEnabled
            );
        };

        new Setting(containerEl)
            .setName("Enable Vision-Description Model")
            .setDesc("Use a local Ollama vision model and write its image description to the configured description property.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiDescriptionPropertyEnabled)
                .onChange(async value => {
                    const wasAnyEnabled = isAnyAiOutputEnabled();
                    this.plugin.settings.aiDescriptionPropertyEnabled = value;
                    this.plugin.settings.imageAnalysisEnabled = value;
                    await this.plugin.saveSettings();
                    updateAiFeatureVisibility(wasAnyEnabled);
                }));

        new Setting(containerEl)
            .setName("Enable AI Tagging via Ollama")
            .setDesc("Use a local Ollama model to turn the AI image description into semantic aitags.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.aiTaggingEnabled)
                .onChange(async (value) => {
                    const wasAnyEnabled = isAnyAiOutputEnabled();
                    this.plugin.settings.aiTaggingEnabled = value;
                    await this.plugin.saveSettings();
                    if (this.plugin.settings.vaultAwarenessEnabled) {
                        this.animateSettingsContent(vaultHostEl, renderVaultEnabled);
                    }
                    this.animateInlineDependencyWarning(vaultToggleWarningHostEl!, renderVaultToggleWarning);
                    updateAiFeatureVisibility(wasAnyEnabled);
                    refreshBridgeDependencies();
                }));

        containerEl.appendChild(aiEnabledHostEl);
        renderAiEnabled();
        if (isAnyAiOutputEnabled()) this.forceSettingsBodyOpen(aiEnabledHostEl);
        this.createSettingsAnchor(containerEl, "bridge", "Bridge");
        const bridgeHowHostEl = containerEl.createDiv();
        const shouldShowBridgeHow = () => !this.plugin.settings.bridgeEnabled
            && !this.plugin.settings.manualEnrichmentEnabled
            && !this.plugin.settings.selfLearningBridgeEnabled;
        const renderBridgeHow = () => {
            bridgeHowHostEl.empty();
            if (!shouldShowBridgeHow()) return;
            this.renderHowItWorksPanel(
                bridgeHowHostEl,
                "How Bridge Enrichment works",
                "Bridge Enrichment lets your own rules add related concepts. Evidence-aware rules use the AI tagging pass, direct expansion applies deterministic rules, and Self-learning Bridge learns reusable relationships between current evidence and existing Vault Awareness vocabulary."
            );
        };
        renderBridgeHow();

        const bridgeHostEl = containerEl.createDiv();
        const renderBridgeEnabled = () => {
            bridgeHostEl.empty();
            const bridgeBodyEl = this.createSettingsRevealContainer(bridgeHostEl);
            bridgeBodyEl.createEl("h4", { text: "Bridge Enrichment Rules" });
            const rerenderBridge = () => this.animateSettingsContent(bridgeHostEl, renderBridgeEnabled);
            const bridgeRulesEnabled = this.plugin.settings.bridgeEnabled || this.plugin.settings.manualEnrichmentEnabled;
            let evidenceWarningHostEl: HTMLElement | null = null;
            let directExpansionWarningHostEl: HTMLElement | null = null;
            let bridgeEngineWarningHostEl: HTMLElement | null = null;
            let aiInputTaggingWarningHostEl: HTMLElement | null = null;
            let aiInputOffWarningHostEl: HTMLElement | null = null;
            let filenameWarningHostEl: HTMLElement | null = null;
            let folderWarningHostEl: HTMLElement | null = null;
            let geolocationWarningHostEl: HTMLElement | null = null;
            let vaultOutputWarningHostEl: HTMLElement | null = null;
            const renderEvidenceWarning = () => {
                if (!evidenceWarningHostEl) return;
                evidenceWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    evidenceWarningHostEl,
                    "Evidence-aware Bridge needs AI Tagging",
                    this.plugin.settings.bridgeEnabled && !this.plugin.settings.aiTaggingEnabled
                        ? ["Evidence-aware Bridge runs during AI Tagging, so it cannot affect output until AI Tagging is enabled."]
                        : [],
                    this.getSettingsSectionIcon("ai-tags")
                );
            };
            const renderDirectExpansionWarning = () => {
                if (!directExpansionWarningHostEl) return;
                directExpansionWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    directExpansionWarningHostEl,
                    "Direct expansion has no usable input",
                    this.plugin.settings.manualEnrichmentEnabled && !this.plugin.hasUsableBridgeInput()
                        ? ["Direct expansion can work without AI, but it needs at least one usable Bridge input: AI tags, filename candidates, Folder Tags candidates, or Geolocation Tags."]
                        : [],
                    this.getSettingsSectionIcon("bridge")
                );
            };
            const renderBridgeEngineWarning = () => {
                if (!bridgeEngineWarningHostEl) return;
                bridgeEngineWarningHostEl.empty();
                const lines = this.plugin.settings.bridgeEnabled
                    && !this.plugin.settings.bridgeUseAiInput
                    && !this.plugin.settings.bridgeUseFilenameInput
                    && !this.plugin.settings.bridgeUseFolderInput
                    && !this.plugin.settings.bridgeUseGeolocationInput
                    ? ["Evidence-aware Bridge is enabled, but every Bridge input is off. Enable at least one input below."]
                    : [];
                this.renderInlineDependencyWarning(
                    bridgeEngineWarningHostEl,
                    "Bridge dependency",
                    lines,
                    this.getSettingsSectionIcon("ai-tags")
                );
            };
            const renderAiInputTaggingWarning = () => {
                if (!aiInputTaggingWarningHostEl) return;
                aiInputTaggingWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    aiInputTaggingWarningHostEl,
                    "AI input is unavailable",
                    this.plugin.settings.bridgeUseAiInput && !this.plugin.settings.aiTaggingEnabled
                        ? ["This specific Bridge input is enabled, but AI Tagging is currently disabled. Direct expansion can still use filename, Folder Tags, or Geolocation inputs."]
                        : [],
                    this.getSettingsSectionIcon("ai-tags")
                );
            };
            const renderAiInputOffWarning = () => {
                if (!aiInputOffWarningHostEl) return;
                aiInputOffWarningHostEl.empty();
            };
            const renderFilenameWarning = () => {
                if (!filenameWarningHostEl) return;
                filenameWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    filenameWarningHostEl,
                    "Filename candidates are off",
                    this.plugin.settings.bridgeEnabled && this.plugin.settings.bridgeUseFilenameInput && this.plugin.settings.filenameCandidateMode === "disabled"
                        ? ["This input is enabled, but Filename Candidate Mode is Disabled in AI Input."]
                        : [],
                    this.getSettingsSectionIcon("ai-tags")
                );
            };
            const renderFolderWarning = () => {
                if (!folderWarningHostEl) return;
                folderWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    folderWarningHostEl,
                    "Folder Tags input is unavailable",
                    this.plugin.settings.bridgeEnabled && this.plugin.settings.bridgeUseFolderInput && !this.plugin.hasActiveFolderAiCandidateSource()
                        ? [this.plugin.settings.useFolderTags
                            ? "No Folder Tags candidate source is set to Consider or All Keywords."
                            : "Folder Tags are currently disabled."]
                        : [],
                    this.getSettingsSectionIcon("folder-tags")
                );
            };
            const renderGeolocationWarning = () => {
                if (!geolocationWarningHostEl) return;
                geolocationWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    geolocationWarningHostEl,
                    "Geolocation Tags are off",
                    this.plugin.settings.bridgeEnabled && this.plugin.settings.bridgeUseGeolocationInput && !this.plugin.settings.geolocationEnabled
                        ? ["This input is enabled, but Geolocation Tags are currently disabled."]
                        : [],
                    this.getSettingsSectionIcon("geolocation")
                );
            };
            const renderVaultOutputWarning = () => {
                if (!vaultOutputWarningHostEl) return;
                vaultOutputWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    vaultOutputWarningHostEl,
                    "Vault Awareness is off",
                    this.plugin.settings.bridgeUsePreBridgeVaultAwarenessOutput && !this.plugin.settings.vaultAwarenessEnabled
                        ? ["This output option is enabled, but Vault Awareness is currently disabled."]
                        : [],
                    this.getSettingsSectionIcon("vault-awareness")
                );
            };
            const animateBridgeWarning = (hostEl: HTMLElement | null, render: () => void) => {
                if (hostEl) this.animateInlineDependencyWarning(hostEl, render);
            };
            const updateBridgeAfterEngineToggle = (wasEnabled: boolean, updateWarnings: () => void) => {
                const isEnabled = this.plugin.settings.bridgeEnabled
                    || this.plugin.settings.manualEnrichmentEnabled
                    || this.plugin.settings.selfLearningBridgeEnabled;
                if (wasEnabled !== isEnabled) {
                    if (isEnabled) {
                        this.animateSettingsCollapseThenRender(bridgeHowHostEl, renderBridgeHow);
                    } else {
                        this.animateSettingsContent(bridgeHowHostEl, renderBridgeHow);
                    }
                    rerenderBridge();
                } else {
                    updateWarnings();
                    rerenderBridge();
                }
            };

            new Setting(bridgeBodyEl)
                .setName("Evidence-aware bridge rules")
                .setDesc("Runs rules against the full available evidence: AI description, generated AI tags, filename candidates, folder candidates, and geolocation context. Example: House => Architecture can trigger when the image description clearly contains a house, even if House was not already an AI tag.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.bridgeEnabled)
                    .onChange(async value => {
                        const wasEnabled = this.plugin.settings.bridgeEnabled
                            || this.plugin.settings.manualEnrichmentEnabled
                            || this.plugin.settings.selfLearningBridgeEnabled;
                        this.plugin.settings.bridgeEnabled = value;
                        await this.plugin.saveSettings();
                        updateBridgeAfterEngineToggle(wasEnabled, () => {
                            animateBridgeWarning(evidenceWarningHostEl, renderEvidenceWarning);
                            animateBridgeWarning(bridgeEngineWarningHostEl, renderBridgeEngineWarning);
                            animateBridgeWarning(filenameWarningHostEl, renderFilenameWarning);
                            animateBridgeWarning(folderWarningHostEl, renderFolderWarning);
                            animateBridgeWarning(geolocationWarningHostEl, renderGeolocationWarning);
                        });
                    }));
            evidenceWarningHostEl = bridgeBodyEl.createDiv();
            renderEvidenceWarning();

            new Setting(bridgeBodyEl)
                .setName("Direct expansion rules")
                .setDesc("Runs exact Bridge rules against enabled Bridge inputs without asking AI. Example: Munich => Germany can trigger from filename or geolocation input, and Castle => Fortress can trigger from accepted AI tags when AI input is available. This does not recursively chain.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.manualEnrichmentEnabled)
                    .onChange(async value => {
                        const wasEnabled = this.plugin.settings.bridgeEnabled
                            || this.plugin.settings.manualEnrichmentEnabled
                            || this.plugin.settings.selfLearningBridgeEnabled;
                        this.plugin.settings.manualEnrichmentEnabled = value;
                        await this.plugin.saveSettings();
                        updateBridgeAfterEngineToggle(wasEnabled, () => {
                            animateBridgeWarning(directExpansionWarningHostEl, renderDirectExpansionWarning);
                            animateBridgeWarning(aiInputOffWarningHostEl, renderAiInputOffWarning);
                        });
                    }));
            directExpansionWarningHostEl = bridgeBodyEl.createDiv();
            renderDirectExpansionWarning();

            bridgeEngineWarningHostEl = bridgeBodyEl.createDiv();
            renderBridgeEngineWarning();

            if (bridgeRulesEnabled) {
                bridgeBodyEl.createEl("h4", { text: "Bridge Inputs" });

            new Setting(bridgeBodyEl)
                .setName("Use filename input")
                .setDesc("Lets evidence-aware Bridge rules use active filename candidates as evidence.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.bridgeUseFilenameInput)
                    .onChange(async value => {
                        this.plugin.settings.bridgeUseFilenameInput = value;
                        await this.plugin.saveSettings();
                        animateBridgeWarning(filenameWarningHostEl, renderFilenameWarning);
                        animateBridgeWarning(directExpansionWarningHostEl, renderDirectExpansionWarning);
                        animateBridgeWarning(bridgeEngineWarningHostEl, renderBridgeEngineWarning);
                    }));
            filenameWarningHostEl = bridgeBodyEl.createDiv();
            renderFilenameWarning();

            this.setSettingNameWithIcon(
                new Setting(bridgeBodyEl)
                    .setDesc("Lets evidence-aware Bridge rules use Folder Tags candidates that are set to Consider or All Keywords.")
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.bridgeUseFolderInput)
                        .onChange(async value => {
                            this.plugin.settings.bridgeUseFolderInput = value;
                            await this.plugin.saveSettings();
                            animateBridgeWarning(folderWarningHostEl, renderFolderWarning);
                            animateBridgeWarning(directExpansionWarningHostEl, renderDirectExpansionWarning);
                            animateBridgeWarning(bridgeEngineWarningHostEl, renderBridgeEngineWarning);
                        })),
                "Use Folder Tags input",
                this.getSettingsSectionIcon("folder-tags")
            );
            folderWarningHostEl = bridgeBodyEl.createDiv();
            renderFolderWarning();

            this.setSettingNameWithIcon(
                new Setting(bridgeBodyEl)
                    .setDesc("Lets evidence-aware Bridge rules use the AI image description and lets direct expansion rules use accepted/generated AI tags when AI Tagging is enabled.")
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.bridgeUseAiInput)
                        .onChange(async value => {
                            this.plugin.settings.bridgeUseAiInput = value;
                            await this.plugin.saveSettings();
                            animateBridgeWarning(aiInputTaggingWarningHostEl, renderAiInputTaggingWarning);
                            animateBridgeWarning(aiInputOffWarningHostEl, renderAiInputOffWarning);
                            animateBridgeWarning(directExpansionWarningHostEl, renderDirectExpansionWarning);
                            animateBridgeWarning(bridgeEngineWarningHostEl, renderBridgeEngineWarning);
                        })),
                "Use AI input",
                this.getSettingsSectionIcon("ai-tags")
            );
            aiInputTaggingWarningHostEl = bridgeBodyEl.createDiv();
            renderAiInputTaggingWarning();
            aiInputOffWarningHostEl = bridgeBodyEl.createDiv();
            renderAiInputOffWarning();

            this.setSettingNameWithIcon(
                new Setting(bridgeBodyEl)
                    .setDesc("Lets evidence-aware Bridge rules use known GPS and reverse-geocode metadata.")
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.bridgeUseGeolocationInput)
                        .onChange(async value => {
                            this.plugin.settings.bridgeUseGeolocationInput = value;
                            await this.plugin.saveSettings();
                            animateBridgeWarning(geolocationWarningHostEl, renderGeolocationWarning);
                            animateBridgeWarning(directExpansionWarningHostEl, renderDirectExpansionWarning);
                            animateBridgeWarning(bridgeEngineWarningHostEl, renderBridgeEngineWarning);
                        })),
                "Use Geolocation input",
                this.getSettingsSectionIcon("geolocation")
            );
            geolocationWarningHostEl = bridgeBodyEl.createDiv();
            renderGeolocationWarning();

            this.setSettingNameWithIcon(
                new Setting(bridgeBodyEl)
                .setDesc("When Vault Awareness writes to a separate output property, include evidence-aware Bridge terms in addition to basic Vault Awareness selections. A matched source includes its rule targets; a target that is directly present inside a longer phrase can also be kept without running the rule backward. Example: House => Architecture can output House and Architecture from House evidence, while Gothic Architecture can output Architecture without inventing House.")
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.bridgeUsePreBridgeVaultAwarenessOutput)
                    .onChange(async value => {
                        this.plugin.settings.bridgeUsePreBridgeVaultAwarenessOutput = value;
                        await this.plugin.saveSettings();
                        animateBridgeWarning(vaultOutputWarningHostEl, renderVaultOutputWarning);
                    })),
                "Use Pre-Bridge Terms in Vault Awareness Output",
                this.getSettingsSectionIcon("vault-awareness")
            );
                vaultOutputWarningHostEl = bridgeBodyEl.createDiv();
                renderVaultOutputWarning();
            }

            if (bridgeRulesEnabled) bridgeBodyEl.createEl("h4", { text: "Bridge Matching" });

            const selfLearningPanelEl = bridgeBodyEl.createDiv({ cls: "autotag-property-panel autotag-vault-candidates-panel" });
            let selfLearningEnabledWarningHostEl: HTMLElement | null = null;
            let selfLearningDependencyWarningHostEl: HTMLElement | null = null;
            const renderSelfLearningEnabledWarning = () => {
                if (!selfLearningEnabledWarningHostEl) return;
                selfLearningEnabledWarningHostEl.empty();
                this.renderInlineDependencyWarning(
                    selfLearningEnabledWarningHostEl,
                    "Self-learning Bridge can change Vault Awareness output",
                    this.plugin.settings.selfLearningBridgeEnabled
                        ? ["This advanced matcher learns and reuses wording relationships. Incorrect relationships can cause false positives across later files, so review learned relationships and use the confidence threshold deliberately."]
                        : [],
                    this.getSettingsSectionIcon("bridge")
                );
            };
            const renderSelfLearningDependencyWarning = () => {
                if (!selfLearningDependencyWarningHostEl) return;
                selfLearningDependencyWarningHostEl.empty();
                const lines: string[] = [];
                if (this.plugin.settings.selfLearningBridgeEnabled && !this.plugin.settings.vaultAwarenessEnabled) {
                    lines.push("Self-learning Bridge needs Vault Awareness because it only maps evidence to existing Vault Awareness vocabulary.");
                }
                if (this.plugin.settings.selfLearningBridgeEnabled && !this.plugin.settings.aiTaggingEnabled) {
                    lines.push("Self-learning Bridge runs during AI Tagging, so it cannot learn or add values until AI Tagging is enabled.");
                }
                this.renderInlineDependencyWarning(
                    selfLearningDependencyWarningHostEl,
                    "Self-learning Bridge dependency",
                    lines,
                    this.getSettingsSectionIcon("vault-awareness")
                );
            };
            const selfLearningHostEl = selfLearningPanelEl.createDiv();
            const renderSelfLearningBridge = () => {
                selfLearningHostEl.empty();
                if (!this.plugin.settings.selfLearningBridgeEnabled) return;

                const panelEl = this.createSettingsRevealContainer(selfLearningHostEl);
                panelEl.createEl("p", {
                    text: "Matches active evidence against existing Vault Awareness vocabulary. Exact and alias matching are local and independently toggleable below. Basic inflections can be learned locally from one evidence channel; derived word forms require two distinct evidence channels. Ambiguous structural and semantic matches use one bounded Ollama verification request. Turning this feature off keeps the saved cache but disables every matching tier, learning, and reuse.",
                    cls: "setting-item-description",
                });

                new Setting(panelEl)
                    .setName("Max Verification Shortlist")
                    .setDesc("Maximum unresolved vault concepts sent in one verification request. The shortlist reserves coverage for active folder, filename, geolocation, AI Tag, and description evidence before filling remaining places by overall relevance.")
                    .addSlider(slider => slider
                        .setLimits(5, 300, 5)
                        .setValue(this.plugin.settings.maxPromptVocabularyTerms)
                        .setDynamicTooltip()
                        .onChange(async value => {
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

                const matchingTierOptions: { key: keyof VaultMatchingTierSettings; name: string; description: string }[] = [
                    { key: "exact", name: "Exact Matches", description: "Accepts an existing vocabulary value when that exact value appears in active evidence." },
                    { key: "aliases", name: "Vault Aliases", description: "Accepts a canonical vocabulary value when one of its configured Obsidian aliases appears." },
                    { key: "learned", name: "Learned Relationships", description: "Reuses previously verified wording relationships locally without another Ollama request." },
                    { key: "structural", name: "Structural Relationships", description: "Accepts basic inflections locally from one evidence channel. Derived forms require two distinct channels; ambiguous compounds, spelling variants, and acronyms still require verification." },
                    { key: "semantic", name: "Semantic Relationships", description: "Uses compact lookup hints from the normal AI Tags response to shortlist direct synonyms and immediate broader or narrower concepts." },
                ];
                matchingTierOptions.forEach(option => {
                    new Setting(panelEl)
                        .setName(option.name)
                        .setDesc(option.description)
                        .addToggle(toggle => toggle
                            .setValue(this.plugin.settings.vaultMatchingTiers[option.key])
                            .onChange(async value => {
                                this.plugin.settings.vaultMatchingTiers[option.key] = value;
                                await this.plugin.saveSettings();
                            }));
                });

                panelEl.createEl("h5", { text: "Learned Relationships" });
                let renderLearnedRelationships: () => void = () => undefined;
                let setMinimumConfidenceSliderValue: (value: number) => void = () => undefined;
                let minimumConfidenceConfirmationOpen = false;
                const applyMinimumRelationshipConfidence = async (value: number): Promise<void> => {
                    this.plugin.settings.learnedVaultRelationMinimumConfidence = value;
                    this.plugin.pruneLearnedVaultRelations();
                    await this.plugin.saveSettings();
                    await this.plugin.syncLearnedVaultRelationsNote();
                    setMinimumConfidenceSliderValue(value);
                    renderLearnedRelationships();
                };
                const requestMinimumRelationshipConfidence = (requestedValue: number): void => {
                    const value = Math.max(0, Math.min(100, Math.round(requestedValue / 5) * 5));
                    const previousValue = this.plugin.settings.learnedVaultRelationMinimumConfidence;
                    if (value === previousValue) {
                        setMinimumConfidenceSliderValue(previousValue);
                        return;
                    }
                    const discardedCount = value > previousValue
                        ? this.plugin.settings.learnedVaultRelations.filter(relation => relation.confidence < value).length
                        : 0;
                    if (discardedCount === 0) {
                        void applyMinimumRelationshipConfidence(value);
                        return;
                    }
                    if (minimumConfidenceConfirmationOpen) {
                        setMinimumConfidenceSliderValue(previousValue);
                        return;
                    }
                    minimumConfidenceConfirmationOpen = true;
                    const releaseConfirmation = () => {
                        minimumConfidenceConfirmationOpen = false;
                    };
                    try {
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Raise minimum relationship confidence?",
                            `Changing the minimum from ${previousValue}% to ${value}% will permanently discard ${discardedCount} learned relationship${discardedCount === 1 ? "" : "s"} below the new threshold.`,
                            `Discard ${discardedCount}`,
                            async () => {
                                try {
                                    await applyMinimumRelationshipConfidence(value);
                                } finally {
                                    releaseConfirmation();
                                }
                            },
                            () => {
                                releaseConfirmation();
                                setMinimumConfidenceSliderValue(previousValue);
                            }
                        ).open();
                    } catch (error) {
                        releaseConfirmation();
                        setMinimumConfidenceSliderValue(previousValue);
                        throw error;
                    }
                };
                new Setting(panelEl)
                    .setName("Relationship cache size limit")
                    .setDesc("Maximum vault-local structural and Ollama recognitions retained for reuse. Manually kept, higher-confidence, and recently used relationships are retained first. Default is 1,500. Learned data itself is not copied through setup profiles.")
                    .addSlider(slider => slider
                        .setLimits(50, 5000, 50)
                        .setValue(this.plugin.settings.learnedVaultRelationCacheLimit)
                        .setDynamicTooltip()
                        .onChange(async value => {
                            this.plugin.settings.learnedVaultRelationCacheLimit = value;
                            this.plugin.pruneLearnedVaultRelations();
                            this.plugin.settings.rejectedVaultRelations = this.plugin.settings.rejectedVaultRelations
                                .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
                                .slice(0, value * 2);
                            this.plugin.rebuildVaultRelationshipIndexes();
                            await this.plugin.saveSettings();
                            await this.plugin.syncLearnedVaultRelationsNote();
                            renderLearnedRelationships();
                        }))
                    .addButton(button => button
                        .setIcon("rotate-ccw")
                        .setTooltip("Reset to default")
                        .onClick(async () => {
                            this.plugin.settings.learnedVaultRelationCacheLimit = DEFAULT_SETTINGS.learnedVaultRelationCacheLimit;
                            this.plugin.pruneLearnedVaultRelations();
                            await this.plugin.saveSettings();
                            await this.plugin.syncLearnedVaultRelationsNote();
                            this.refreshDisplayAnimated();
                        }));

                new Setting(panelEl)
                    .setName("Minimum relationship confidence")
                    .setDesc("Relationships below this score are rejected from future proposals and cannot affect current or later Vault Awareness output. Raising the threshold asks for confirmation before existing relationships are discarded. Lower values retain more uncertain mappings; higher values reduce false positives but may require more Ollama verification. Default is 60%.")
                    .addSlider(slider => {
                        slider
                            .setLimits(0, 100, 5)
                            .setValue(this.plugin.settings.learnedVaultRelationMinimumConfidence)
                            .setDynamicTooltip();
                        setMinimumConfidenceSliderValue = value => slider.setValue(value);
                        slider.sliderEl.addEventListener("change", () => {
                            requestMinimumRelationshipConfidence(Number(slider.sliderEl.value));
                        });
                    })
                    .addButton(button => button
                        .setIcon("rotate-ccw")
                        .setTooltip("Reset to default")
                        .onClick(() => {
                            requestMinimumRelationshipConfidence(DEFAULT_SETTINGS.learnedVaultRelationMinimumConfidence);
                        }));

                const learnedRelationshipsHostEl = panelEl.createDiv();
                renderLearnedRelationships = () => {
                    learnedRelationshipsHostEl.empty();
                    const relationCount = this.plugin.settings.learnedVaultRelations.length;
                    const rejectedCount = this.plugin.settings.rejectedVaultRelations.length;
                    learnedRelationshipsHostEl.createEl("p", {
                        text: relationCount > 0
                            ? `${relationCount} accepted relationship${relationCount === 1 ? "" : "s"} and ${rejectedCount} temporary rejection${rejectedCount === 1 ? "" : "s"} retained. Open the operational file to review them.`
                            : rejectedCount > 0
                                ? `${rejectedCount} temporary rejection${rejectedCount === 1 ? "" : "s"} retained. No reusable relationship has been learned yet.`
                                : "No relationships have been learned yet. Structural matching or Ollama verification can add one when existing vocabulary appears through different wording.",
                        cls: "setting-item-description",
                    });
                    learnedRelationshipsHostEl.createEl("p", {
                        text: "Exact vocabulary matches and configured aliases do not need learning and are intentionally omitted from this file.",
                        cls: "setting-item-description",
                    });
                    new Setting(learnedRelationshipsHostEl)
                        .setName("Review learned relationships")
                        .setDesc("Search by wording, vault value, type, or model; filter by maximum confidence; then keep, edit, temporarily reject, or remove individual relationships.")
                        .addButton(button => button
                            .setButtonText("Review Relationships")
                            .setDisabled(relationCount === 0)
                            .onClick(() => new LearnedRelationshipsReviewModal(
                                this.app,
                                this.plugin,
                                () => renderLearnedRelationships()
                            ).open()));
                    new Setting(learnedRelationshipsHostEl)
                        .setName("Learned relationships file")
                        .setDesc(`${LEARNED_VAULT_RELATIONS_FILE_NAME} is generated inside the Autotag plugin folder, beside its operational data rather than inside your vault notes. It is updated when relationships are learned, rejected, trimmed, or cleared. The button reveals it in your system file browser because files inside .obsidian cannot be opened as normal vault notes.`)
                        .addButton(button => button
                            .setButtonText("Show Relations File")
                            .onClick(async () => {
                                await this.plugin.showLearnedVaultRelationsFile();
                            }));
                    new Setting(learnedRelationshipsHostEl)
                        .setName("Clear learned relationships")
                        .setDesc("Forgets all cached structural and Ollama relationship recognitions in this vault. Vault vocabulary and existing note properties are not changed.")
                        .addButton(button => button
                            .setButtonText("Clear")
                            .setWarning()
                            .setDisabled(relationCount === 0 && rejectedCount === 0)
                            .onClick(async () => {
                                this.plugin.settings.learnedVaultRelations = [];
                                this.plugin.settings.rejectedVaultRelations = [];
                                this.plugin.rebuildVaultRelationshipIndexes();
                                await this.plugin.saveSettings();
                                await this.plugin.syncLearnedVaultRelationsNote();
                                renderLearnedRelationships();
                                new Notice("Cleared Self-learning Bridge relationships.");
                            }));
                    this.enhanceInfoDescriptionAnimations(learnedRelationshipsHostEl);
                };
                renderLearnedRelationships();
            };

            const selfLearningToggleSetting = new Setting(selfLearningPanelEl)
                    .setDesc("Controls exact, alias, learned, structural, and semantic matching against existing Vault Awareness vocabulary. Default is on. Turning it off disables matching and learning without deleting saved relationships.")
                    .addToggle(toggle => toggle
                        .setValue(this.plugin.settings.selfLearningBridgeEnabled)
                        .onChange(async value => {
                            const wasEnabled = bridgeRulesEnabled || this.plugin.settings.selfLearningBridgeEnabled;
                            this.plugin.settings.selfLearningBridgeEnabled = value;
                            await this.plugin.saveSettings();
                            if (value) {
                                this.animateSettingsContent(selfLearningHostEl, renderSelfLearningBridge);
                            } else {
                                this.animateSettingsCollapseThenRender(selfLearningHostEl, renderSelfLearningBridge);
                            }
                            this.animateInlineDependencyWarning(selfLearningEnabledWarningHostEl!, renderSelfLearningEnabledWarning);
                            this.animateInlineDependencyWarning(selfLearningDependencyWarningHostEl!, renderSelfLearningDependencyWarning);
                            const isEnabled = bridgeRulesEnabled || value;
                            if (wasEnabled !== isEnabled) {
                                if (isEnabled) {
                                    this.animateSettingsCollapseThenRender(bridgeHowHostEl, renderBridgeHow);
                                } else {
                                    this.animateSettingsContent(bridgeHowHostEl, renderBridgeHow);
                                }
                            }
                        }));
            this.setSettingNameWithIcon(
                selfLearningToggleSetting,
                "Enable Self-learning Bridge",
                this.getSettingsSectionIcon("vault-awareness")
            );
            selfLearningPanelEl.prepend(selfLearningToggleSetting.settingEl);
            selfLearningEnabledWarningHostEl = selfLearningPanelEl.createDiv();
            selfLearningDependencyWarningHostEl = selfLearningPanelEl.createDiv();
            selfLearningPanelEl.insertBefore(selfLearningEnabledWarningHostEl, selfLearningHostEl);
            selfLearningPanelEl.insertBefore(selfLearningDependencyWarningHostEl, selfLearningHostEl);
            renderSelfLearningEnabledWarning();
            renderSelfLearningDependencyWarning();
            refreshBridgeDependencies = () => {
                animateBridgeWarning(evidenceWarningHostEl, renderEvidenceWarning);
                animateBridgeWarning(aiInputTaggingWarningHostEl, renderAiInputTaggingWarning);
                animateBridgeWarning(selfLearningDependencyWarningHostEl, renderSelfLearningDependencyWarning);
            };
            renderSelfLearningBridge();
            if (this.plugin.settings.selfLearningBridgeEnabled) this.forceSettingsBodyOpen(selfLearningHostEl);

            if (bridgeRulesEnabled) new Setting(bridgeBodyEl)
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
            if (bridgeRulesEnabled) {
                renderBridgeLinguistics();
                if (!this.plugin.settings.hideBridgeLinguisticFeatures) this.forceSettingsBodyOpen(bridgeLinguisticsHostEl);
            }

            if (bridgeRulesEnabled) new Setting(bridgeBodyEl)
                .setName("Bridge rule list")
                .setDesc("One rule per line, shared by both Bridge engines. Evidence-aware rules ask the AI tag pass whether enabled evidence represents a left-side source concept. Direct expansion runs locally when a left-side source is found in any usable Bridge input. Example: House, Structure => Architecture.")
                .addTextArea(textArea => {
                    textArea.inputEl.rows = 5;
                    textArea.setPlaceholder("House, Structure, Building => Architecture\nCartoon => Anime, Drawing")
                        .setValue(this.plugin.getCombinedBridgeRuleText())
                        .onChange(async (value) => {
                            this.plugin.settings.bridgeRules = value;
                            await this.plugin.saveSettings();
                        });
                });

            bridgeBodyEl.createEl("h4", { text: "Self-learning Bridge" });
            bridgeBodyEl.appendChild(selfLearningPanelEl);

            this.wrapSubcategoryPanels(bridgeBodyEl);
            this.enhanceInfoDescriptionAnimations(bridgeBodyEl);
        };
        renderBridgeEnabled();
        this.forceSettingsBodyOpen(bridgeHostEl);
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
            .setName("Delete linked image/note pair")
            .setDesc("When an image or its companion note is deleted, also delete the linked counterpart and stop queued processing for both. For smoother pair deletion, set Obsidian Settings > Files and links > Delete attachments when deleting files to Never. Turning this off still cleans queue/hash state for the deleted file itself.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.deleteLinkedFilePair)
                .onChange(async value => {
                    this.plugin.settings.deleteLinkedFilePair = value;
                    await this.plugin.saveSettings();
                }));

        this.renderLimitedFileTypeWarningSettings(containerEl);
        containerEl.createEl('h4', { text: 'Fix' });
        const duplicateFixWarningLines: string[] = [];
        const duplicateHashWarningLines: string[] = [];
        const duplicateManualPairWarningLines: string[] = [];
        if (duplicateUnhashedFileCount > 0) {
            duplicateHashWarningLines.push(`${duplicateUnhashedFileCount} watched file${duplicateUnhashedFileCount === 1 ? " is" : "s are"} missing duplicate hash records. Use Regenerate hashes for all files, Copy unhashed file paths, or Move affected Files.`);
        }
        if (duplicateUnlinkedHashCount > 0) {
            duplicateHashWarningLines.push(`${duplicateUnlinkedHashCount} duplicate hash record${duplicateUnlinkedHashCount === 1 ? "" : "s"} point to files that no longer exist. Use Copy unlinked hash details, Move affected Files, or Delete unlinked hashes.`);
        }
        if (duplicateUnpairedFileCount > 0) {
            duplicateManualPairWarningLines.push(`${duplicateUnpairedFileCount} pairable file${duplicateUnpairedFileCount === 1 ? " is" : "s are"} not linked in the pair database. Use Manual Pairing, Copy unpaired file paths, Delete unpaired files, or Move affected Files.`);
        }
        if (duplicateHashWarningLines.length > 0) {
            duplicateFixWarningLines.push("Hash records need attention. Use the Hashes block below to regenerate, move, copy, or delete affected hash records.");
        }
        if (duplicateManualPairWarningLines.length > 0) {
            duplicateFixWarningLines.push("Pair records need attention. Use Search when you need to inspect a pair, then Manual Pairing to repair missing pair links.");
        }
        this.renderProblemWarningPanel(
            containerEl,
            "autotag-duplicate-fix-warning",
            "Duplicate fix attention",
            duplicateFixWarningLines,
            "warning",
            "Duplicate concerns are repaired here. Start with Search when you need to inspect a pair, or jump to the specific repair block below."
        );

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

        const duplicateSearchPanelEl = containerEl.createDiv({ cls: "autotag-property-panel" });
        duplicateSearchPanelEl.id = "autotag-duplicate-fix-start";
        duplicateSearchPanelEl.createEl("h5", { text: "Search" });
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
        new Setting(duplicateSearchPanelEl)
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
        pairLookupByFileResult = duplicateSearchPanelEl.createEl("p", { cls: "setting-item-description" });
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
        new Setting(duplicateSearchPanelEl)
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
        pairLookupByIdResult = duplicateSearchPanelEl.createEl("p", { cls: "setting-item-description" });
        updatePairLookupById("");

        const duplicateManualPairPanelEl = containerEl.createDiv({ cls: "autotag-property-panel" });
        duplicateManualPairPanelEl.id = "autotag-duplicate-manual-pair";
        duplicateManualPairPanelEl.createEl("h5", { text: "Manual Pairing" });
        this.renderProblemWarningPanel(
            duplicateManualPairPanelEl,
            "autotag-duplicate-manual-pair-warning",
            "Manual pairing attention",
            duplicateManualPairWarningLines,
            "warning",
            "Manual pairing repairs the internal link between one source file and one companion note without moving or deleting either file."
        );
        duplicateManualPairPanelEl.createEl("p", {
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
            renderManualPairSearchResult(manualPairNoteResult, file, value.trim() ? "No companion note found in the Companion Note Folder." : "Search for the companion note in the Companion Note Folder to pair.");
        };

        new Setting(duplicateManualPairPanelEl)
            .setName("Manual pair image/source file")
            .setDesc("Searches only watched/source files inside the Base Path. You can use filename, vault-relative path, or full Windows path.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.plugin.getManualPairImageFiles().map(file => this.getPathSuggestionRelativeToRoot(file.path, this.plugin.settings.basePath)));
                text.setPlaceholder("Beach Room.jpg")
                    .onChange(value => updateManualPairImage(value));
            });
        manualPairImageResult = duplicateManualPairPanelEl.createEl("p", { cls: "setting-item-description" });
        updateManualPairImage("");

        new Setting(duplicateManualPairPanelEl)
            .setName("Manual pair companion note")
            .setDesc("Searches only markdown companion notes inside the Companion Note Folder. You can use filename, vault-relative path, or full Windows path.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.plugin.getManualPairNoteFiles().map(file => this.getPathSuggestionRelativeToRoot(file.path, this.plugin.getEffectiveCompanionNoteFolder())));
                text.setPlaceholder("Ata_Beach Room_jpg.md")
                    .onChange(value => updateManualPairNote(value));
            });
        manualPairNoteResult = duplicateManualPairPanelEl.createEl("p", { cls: "setting-item-description" });
        updateManualPairNote("");

        new Setting(duplicateManualPairPanelEl)
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

        new Setting(duplicateManualPairPanelEl)
            .setName("Copy unpaired file paths")
            .setDesc(`${duplicateUnpairedFileCount} pairable file${duplicateUnpairedFileCount === 1 ? "" : "s"} are not currently in the pair database.`)
            .addButton(button => button
                .setButtonText("Copy Paths")
                .onClick(async () => {
                    await this.plugin.copyUnpairedFilesToClipboard();
                }));
        this.renderMoveAffectedFilesSetting(
            duplicateManualPairPanelEl,
            "Choose a vault folder and move currently unpaired image/source files or companion notes there.",
            "Unpaired Files",
            "unpaired file",
            () => this.plugin.getUnpairedFiles()
        );

        new Setting(duplicateManualPairPanelEl)
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
                button.buttonEl.addClass("autotag-danger-button");
            });

        const duplicateHashesPanelEl = containerEl.createDiv({ cls: "autotag-property-panel" });
        duplicateHashesPanelEl.id = "autotag-duplicate-hashes";
        duplicateHashesPanelEl.createEl("h5", { text: "Hashes" });
        this.renderProblemWarningPanel(
            duplicateHashesPanelEl,
            "autotag-duplicate-hashes-warning",
            "Hash cleanup attention",
            duplicateHashWarningLines,
            "warning",
            "Hash cleanup repairs the duplicate index so duplicate detection compares against the current vault state."
        );

        new Setting(duplicateHashesPanelEl)
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

        new Setting(duplicateHashesPanelEl)
            .setName("Copy unhashed file paths")
            .setDesc(`${duplicateUnhashedFileCount} file${duplicateUnhashedFileCount === 1 ? "" : "s"} under the watched base path currently have no duplicate hash record.`)
            .addButton(button => button
                .setButtonText("Copy Paths")
                .onClick(async () => {
                    await this.plugin.copyUnhashedFilesToClipboard();
                }));
        this.renderMoveAffectedFilesSetting(
            duplicateHashesPanelEl,
            "Choose a vault folder and move source files that currently have no duplicate hash record there.",
            "Unhashed Files",
            "unhashed file",
            () => this.plugin.getUnhashedFiles()
        );

        new Setting(duplicateHashesPanelEl)
            .setName("Copy unlinked hash details")
            .setDesc(`${duplicateUnlinkedHashCount} duplicate hash record${duplicateUnlinkedHashCount === 1 ? "" : "s"} point to a missing image or companion note.`)
            .addButton(button => button
                .setButtonText("Copy Details")
                .onClick(async () => {
                    await this.plugin.copyUnlinkedHashesToClipboard();
                }));
        this.renderMoveAffectedFilesSetting(
            duplicateHashesPanelEl,
            "Choose a vault folder and move existing files that belong to unlinked duplicate hash records there.",
            "Unlinked Hashes",
            "unlinked hash file",
            () => this.plugin.getUnlinkedHashAffectedFiles()
        );

        new Setting(duplicateHashesPanelEl)
            .setName("Delete unlinked hashes")
            .setDesc(`${duplicateUnlinkedHashCount} unlinked duplicate hash record${duplicateUnlinkedHashCount === 1 ? "" : "s"} can be deleted.`)
            .addButton(button => {
                button
                    .setButtonText("Delete unlinked hashes")
                    .setWarning()
                    .onClick(() => {
                        new ConfirmDestructiveActionModal(
                            this.app,
                            "Delete unlinked hashes?",
                            `This removes ${duplicateUnlinkedHashCount} duplicate hash record${duplicateUnlinkedHashCount === 1 ? "" : "s"} that point to missing files. Existing files and notes are not deleted.`,
                            "Delete unlinked hashes",
                            async () => {
                                await this.plugin.deleteUnlinkedHashes();
                                this.refreshDisplayAnimated();
                            }
                        ).open();
                    });
                button.buttonEl.addClass("autotag-danger-button");
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
            if (this.plugin.settings.processedFiles.some(processedPath => this.plugin.areVaultPathsSame(processedPath, file.path))) return "Processed before.";
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
                if (value.trim()) reprocessFileResult.setText("No companion note found in the Companion Note Folder.");
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
            .setDesc("Searches companion notes inside the Companion Note Folder. The button resolves the linked source file, clears its processed, failed, and resume state, then queues it again.")
            .addText(text => {
                this.attachTextSuggestions(text.inputEl, this.plugin.getManualPairNoteFiles().map(file => this.getPathSuggestionRelativeToRoot(file.path, this.plugin.getEffectiveCompanionNoteFolder())));
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
            .setDesc("Searches image/source files inside the Base Path and creates the expected companion note only when no companion note exists.")
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
            .setDesc("Queues every unprocessed file inside the Base Path for normal Autotag processing. Missing companion notes are created in the Companion Note Folder during processing, according to your current settings.")
            .addButton(button => button
                .setButtonText("Process Existing Files")
                .setCta()
                .onClick(async () => {
                    await this.plugin.processUnprocessedBaseFiles();
                    this.refreshDisplayAnimated();
                }));

        new Setting(containerEl)
            .setName("Index existing files")
            .setDesc("Scans unprocessed source files inside the Base Path that still need indexing. It creates missing companion notes when needed, pairs source files with their companion notes, and writes duplicate hashes only for those files, leaving already working indexed files alone.")
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
        const failedFilesNeedingAttention = this.plugin.getFailedFileRecordsNeedingAttention();
        const failedFileCount = failedFilesNeedingAttention.length;
        const failedWarningLines: string[] = [];
        if (failedFileCount > 0) {
            failedWarningLines.push(`${failedFileCount} failed file${failedFileCount === 1 ? " is" : "s are"} tracked. Use Retry Failed Files, Copy failed file details, Delete failed files, Move affected Files, or Open Failure Help Note.`);
        }
        this.renderProblemWarningPanel(
            containerEl,
            "autotag-failed-files-warning",
            "Failed files attention",
            failedWarningLines,
            "warning",
            "Failed files have stopped retrying automatically so the same problem does not loop forever."
        );

        containerEl.createEl('p', {
            text: failedFileCount > 0
                ? `${failedFileCount} failed file${failedFileCount === 1 ? "" : "s"} tracked. Failed files stop retrying after ${this.plugin.settings.maxProcessingAttempts} attempts.`
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
                        const failedFiles = this.plugin.getFailedFileRecordsNeedingAttention();
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
                        const failedCount = this.plugin.getFailedFileRecordsNeedingAttention().length;
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
                button.buttonEl.addClass("autotag-danger-button");
            });
        new Setting(containerEl)
            .setName("Delete failed files")
            .setDesc("Deletes the files currently listed as failed and clears their failure records. Missing files are cleaned from the failed list.")
            .addButton(button => {
                button
                    .setButtonText("Delete Failed")
                    .setWarning()
                    .onClick(() => {
                        const failedCount = this.plugin.getFailedFileRecordsNeedingAttention().length;
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
                button.buttonEl.addClass("autotag-danger-button");
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
        const unprocessedWarningLines = recoverUnprocessedBaseFiles.length > 0
            ? [`${recoverUnprocessedBaseFiles.length} watched file${recoverUnprocessedBaseFiles.length === 1 ? " is" : "s are"} not marked processed. Use Process all unprocessed files when you want a vault-wide catch-up run.`]
            : [];
        this.renderProblemWarningPanel(
            containerEl,
            "autotag-unprocessed-files-warning",
            "Unprocessed files attention",
            unprocessedWarningLines,
            "warning",
            "Unprocessed watched files are available for a catch-up run from the current Base Path."
        );
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
				button.buttonEl.addClass("autotag-danger-button");
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
        this.createSettingsAnchor(containerEl, "thanks", "Thanks");
        this.renderThanksSettings(containerEl);
        this.organizeRenderedSettingsSections(containerEl);
        this.enhanceInfoDescriptionAnimations(containerEl);
        this.registerInfoCloseGuards(containerEl);
        const backToTopEl = containerEl.createDiv({ cls: "autotag-back-to-top" });
        const backToTopButton = backToTopEl.createEl("button", { text: "Back to top" });
        backToTopButton.type = "button";
        backToTopButton.onclick = () => this.scrollSettingsToTop();
    }
}

