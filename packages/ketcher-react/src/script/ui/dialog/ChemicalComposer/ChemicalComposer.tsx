import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AnyAction, Dispatch } from 'redux';
import type { SdfItem } from 'ketcher-core';
import {
  Dialog,
  Icon,
  MemoizedStructRender,
  type IStructRenderProps,
} from 'components';
import type { BaseCallProps, BaseProps } from '../../views/modal/modal.types';
import {
  createDirectNotationCandidate,
  deleteMechanismSet,
  loadSavedMechanismSets,
  rankChemicalCandidates,
  saveMechanismSet,
  searchLocalChemicals,
  searchPubChemByName,
  type ChemicalCandidate,
  type ParticipantRole,
  type PlacementDensity,
  type SavedMechanismSet,
  type TrayChemical,
} from '../../services/chemicalComposer';
import {
  arrangeSelectedParticipants,
  duplicateSelectedAsNextStep,
  placeChemicalManually,
  placeChemicalsAutomatically,
} from '../../state/chemicalComposer';
import classes from './ChemicalComposer.module.less';

type Props = Pick<BaseProps, 'className'> & BaseCallProps;

interface ChemicalComposerStoreState {
  templates?: { lib?: SdfItem[] };
  functionalGroups?: { lib?: SdfItem[] };
  saltsAndSolvents?: { lib?: SdfItem[] };
  editor?: { render?: { options?: IStructRenderProps['options'] } };
}

type ComposerThunk =
  | ReturnType<typeof placeChemicalManually>
  | ReturnType<typeof placeChemicalsAutomatically>
  | ReturnType<typeof arrangeSelectedParticipants>
  | ReturnType<typeof duplicateSelectedAsNextStep>;

type ComposerDispatch = Dispatch<AnyAction> &
  ((action: ComposerThunk) => unknown);

const SOURCE_LABELS: Record<ChemicalCandidate['source'], string> = {
  direct: 'Structure notation',
  pubchem: 'PubChem',
  template: 'Template library',
  'functional-group': 'Functional groups',
  'salt-or-solvent': 'Salts and solvents',
};

const REPRESENTATION_LABELS: Record<
  ChemicalCandidate['representation'],
  string
> = {
  molecule: 'Expanded molecule',
  fragment: 'Structure fragment',
  notation: 'Direct notation',
};

const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  reactant: 'Reactant',
  reagent: 'Reagent',
  intermediate: 'Intermediate',
  product: 'Product',
};

export const AUTO_SEARCH_DELAY_MS = 250;

function CandidatePreview({
  candidate,
  renderOptions,
}: {
  candidate: ChemicalCandidate;
  renderOptions?: IStructRenderProps['options'];
}) {
  if (candidate.previewUrl) {
    return (
      <img
        src={candidate.previewUrl}
        alt={`2D structure of ${candidate.name}`}
        className={classes.previewImage}
      />
    );
  }

  if (typeof candidate.structure !== 'string') {
    return (
      <MemoizedStructRender
        struct={candidate.structure}
        className={classes.structurePreview}
        fullsize={true}
        options={{
          ...renderOptions,
          autoScaleMargin: 8,
          cachePrefix: 'chemical-composer',
          downScale: true,
        }}
      />
    );
  }

  return (
    <div className={classes.notationPreview} title={candidate.structure}>
      {candidate.structure}
    </div>
  );
}

function candidateKey(candidate: ChemicalCandidate): string {
  return `${candidate.source}:${candidate.id}`;
}

export function ChemicalComposer({ className, onCancel, onOk }: Props) {
  const dispatch = useDispatch<ComposerDispatch>();
  const templates = useSelector<ChemicalComposerStoreState, SdfItem[]>(
    (state) => state.templates?.lib ?? [],
  );
  const functionalGroups = useSelector<ChemicalComposerStoreState, SdfItem[]>(
    (state) => state.functionalGroups?.lib ?? [],
  );
  const saltsAndSolvents = useSelector<ChemicalComposerStoreState, SdfItem[]>(
    (state) => state.saltsAndSolvents?.lib ?? [],
  );
  const renderOptions = useSelector<
    ChemicalComposerStoreState,
    IStructRenderProps['options'] | undefined
  >((state) => state.editor?.render?.options);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChemicalCandidate[]>([]);
  const [tray, setTray] = useState<TrayChemical[]>([]);
  const [density, setDensity] = useState<PlacementDensity>('standard');
  const [setName, setSetName] = useState('');
  const [savedSets, setSavedSets] = useState<SavedMechanismSet[]>(() =>
    loadSavedMechanismSets(),
  );
  const [selectedSetId, setSelectedSetId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const searchTimer = useRef<number | null>(null);
  const latestQuery = useRef('');
  const traySequence = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      abortController.current?.abort();
      if (searchTimer.current !== null) {
        window.clearTimeout(searchTimer.current);
      }
    };
  }, []);

  const libraries = useMemo(
    () => ({ templates, functionalGroups, saltsAndSolvents }),
    [templates, functionalGroups, saltsAndSolvents],
  );

  latestQuery.current = query.trim();

  const runSearch = useCallback(
    async (searchQuery: string) => {
      const normalizedQuery = searchQuery.trim();
      if (searchTimer.current !== null) {
        window.clearTimeout(searchTimer.current);
        searchTimer.current = null;
      }
      if (!normalizedQuery) {
        setResults([]);
        setSearchError(null);
        setIsSearching(false);
        return;
      }

      abortController.current?.abort();
      const controller = new AbortController();
      abortController.current = controller;
      setIsSearching(true);
      setSearchError(null);

      const localResults = searchLocalChemicals(normalizedQuery, libraries);
      const directCandidate = createDirectNotationCandidate(normalizedQuery);

      try {
        const remoteResults = directCandidate
          ? []
          : await searchPubChemByName(normalizedQuery, controller.signal);
        const allResults = [
          ...(directCandidate ? [directCandidate] : []),
          ...localResults,
          ...remoteResults,
        ];
        const deduplicated = allResults.filter(
          (candidate, index) =>
            allResults.findIndex(
              (other) => candidateKey(other) === candidateKey(candidate),
            ) === index,
        );
        if (latestQuery.current !== normalizedQuery) return;
        setResults(rankChemicalCandidates(normalizedQuery, deduplicated));
        if (!deduplicated.length) {
          setSearchError(
            'No matching chemical was found. Try a common name, SMILES, InChI, or a local template name.',
          );
        }
      } catch (error: unknown) {
        if (
          controller.signal.aborted ||
          latestQuery.current !== normalizedQuery
        ) {
          return;
        }
        setResults(
          rankChemicalCandidates(normalizedQuery, [
            ...(directCandidate ? [directCandidate] : []),
            ...localResults,
          ]),
        );
        setSearchError(
          error instanceof Error
            ? error.message
            : 'The online chemical search is unavailable.',
        );
      } finally {
        if (
          !controller.signal.aborted &&
          latestQuery.current === normalizedQuery
        ) {
          setIsSearching(false);
        }
      }
    },
    [libraries],
  );

  useEffect(() => {
    const normalizedQuery = query.trim();
    abortController.current?.abort();

    if (searchTimer.current !== null) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }

    if (!normalizedQuery) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const localResults = searchLocalChemicals(normalizedQuery, libraries);
    const directCandidate = createDirectNotationCandidate(normalizedQuery);
    setResults(
      rankChemicalCandidates(normalizedQuery, [
        ...(directCandidate ? [directCandidate] : []),
        ...localResults,
      ]),
    );
    setSearchError(null);

    if (directCandidate) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimer.current = window.setTimeout(() => {
      runSearch(normalizedQuery);
    }, AUTO_SEARCH_DELAY_MS);

    return () => {
      if (searchTimer.current !== null) {
        window.clearTimeout(searchTimer.current);
        searchTimer.current = null;
      }
    };
  }, [libraries, query, runSearch]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    runSearch(query);
  };

  const stopDialogEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.stopPropagation();
  };

  const addToTray = (candidate: ChemicalCandidate) => {
    traySequence.current += 1;
    setTray((current) => [
      ...current,
      {
        ...candidate,
        trayId: `tray-${traySequence.current}`,
        role: 'reactant',
      },
    ]);
  };

  const removeFromTray = (trayId: string) => {
    setTray((current) => current.filter((item) => item.trayId !== trayId));
  };

  const moveTrayItem = (index: number, offset: -1 | 1) => {
    setTray((current) => {
      const destination = index + offset;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  };

  const updateTrayRole = (trayId: string, role: ParticipantRole) => {
    setTray((current) =>
      current.map((item) =>
        item.trayId === trayId ? { ...item, role } : item,
      ),
    );
  };

  const placeAutomatically = (
    candidates: Array<ChemicalCandidate | TrayChemical>,
  ) => {
    dispatch(
      placeChemicalsAutomatically(
        candidates.map((candidate) => ({
          structure: candidate.structure,
          name: candidate.name,
          role: 'role' in candidate ? candidate.role : 'reactant',
        })),
        density,
      ),
    );
  };

  const placeManually = (candidate: ChemicalCandidate) => {
    dispatch(placeChemicalManually(candidate.structure));
  };

  const saveCurrentSet = () => {
    if (!setName.trim() || !tray.length) return;
    try {
      const next = saveMechanismSet(setName, tray, density);
      setSavedSets(next);
      setSelectedSetId(next[0]?.id ?? '');
      setSetName('');
      setSearchError(null);
    } catch (error: unknown) {
      setSearchError(
        error instanceof Error ? error.message : 'The set could not be saved.',
      );
    }
  };

  const loadSelectedSet = () => {
    const set = savedSets.find((candidate) => candidate.id === selectedSetId);
    if (!set) return;
    setDensity(set.density);
    setTray(
      set.participants.map((participant) => {
        traySequence.current += 1;
        return {
          ...participant,
          trayId: `tray-${traySequence.current}`,
        };
      }),
    );
  };

  const deleteSelectedSet = () => {
    if (!selectedSetId) return;
    const next = deleteMechanismSet(selectedSetId);
    setSavedSets(next);
    setSelectedSetId(next[0]?.id ?? '');
  };

  const headerContent = (
    <div className={classes.headerContent}>
      <Icon name="search" />
      <span>Insert Chemical</span>
    </div>
  );

  return (
    <Dialog
      headerContent={headerContent}
      className={classes.dialog}
      params={{ className, onCancel, onOk }}
      buttons={[]}
      needMargin={false}
      focusable={false}
    >
      <div className={classes.composer}>
        <section className={classes.searchPanel}>
          <form className={classes.searchForm} onSubmit={submitSearch}>
            <div className={classes.searchInputWrap}>
              <Icon name="search" className={classes.searchIcon} />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={stopDialogEnter}
                placeholder="Name, SMILES, InChI, or local template"
                aria-label="Chemical search"
                data-testid="chemical-search-input"
              />
            </div>
            {query.trim() && (
              <div
                className={classes.searchStatus}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-testid="chemical-search-status"
              >
                <span
                  className={
                    isSearching ? classes.searchSpinner : classes.searchComplete
                  }
                  aria-hidden="true"
                />
                {isSearching ? 'Searching…' : 'Updated'}
              </div>
            )}
          </form>

          <div className={classes.searchHint}>
            Searches as you type: Ketcher libraries first, then PubChem for
            chemical names. Structure notation is parsed directly.
          </div>

          {searchError && (
            <div className={classes.searchError} role="status">
              {searchError}
            </div>
          )}

          <div className={classes.results} data-testid="chemical-results">
            {!results.length && !searchError && !isSearching && (
              <div className={classes.emptyState}>
                Search for a chemical, or paste a SMILES such as{' '}
                <button type="button" onClick={() => setQuery('CCO')}>
                  CCO
                </button>
                .
              </div>
            )}
            {results.map((candidate) => (
              <article
                className={classes.resultCard}
                key={candidateKey(candidate)}
                data-testid="chemical-result"
              >
                <div className={classes.previewSlot}>
                  <CandidatePreview
                    candidate={candidate}
                    renderOptions={renderOptions}
                  />
                </div>
                <div className={classes.resultDetails}>
                  <strong>{candidate.name}</strong>
                  <span>{SOURCE_LABELS[candidate.source]}</span>
                  <span className={classes.representationBadge}>
                    {REPRESENTATION_LABELS[candidate.representation]}
                  </span>
                  {candidate.formula && <span>{candidate.formula}</span>}
                  {candidate.charge !== undefined && candidate.charge !== 0 && (
                    <span>Charge: {candidate.charge}</span>
                  )}
                  {candidate.description && (
                    <small>{candidate.description}</small>
                  )}
                </div>
                <div className={classes.resultActions}>
                  <button
                    type="button"
                    className={classes.primaryButton}
                    onClick={() => placeAutomatically([candidate])}
                  >
                    Add next
                  </button>
                  <button
                    type="button"
                    className={classes.secondaryButton}
                    onClick={() => placeManually(candidate)}
                  >
                    Place manually
                  </button>
                  <button
                    type="button"
                    className={classes.textButton}
                    onClick={() => addToTray(candidate)}
                  >
                    + Tray
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className={classes.trayPanel}>
          <div className={classes.trayHeader}>
            <div>
              <strong>Placement tray</strong>
              <span>{tray.length} chemicals</span>
            </div>
            {tray.length > 0 && (
              <button
                type="button"
                className={classes.textButton}
                onClick={() => setTray([])}
              >
                Clear
              </button>
            )}
          </div>

          <ol className={classes.trayList} data-testid="chemical-tray">
            {!tray.length && (
              <li className={classes.trayEmpty}>
                Add several results here, then place the complete row in one
                action.
              </li>
            )}
            {tray.map((item, index) => (
              <li key={item.trayId} className={classes.trayItem}>
                <div className={classes.trayItemName}>
                  <span>{index + 1}</span>
                  <strong>{item.name}</strong>
                </div>
                <select
                  aria-label={`Role for ${item.name}`}
                  value={item.role}
                  onChange={(event) =>
                    updateTrayRole(
                      item.trayId,
                      event.target.value as ParticipantRole,
                    )
                  }
                >
                  {Object.entries(PARTICIPANT_ROLE_LABELS).map(
                    ([role, label]) => (
                      <option key={role} value={role}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
                <div className={classes.trayItemActions}>
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Move ${item.name} earlier`}
                    onClick={() => moveTrayItem(index, -1)}
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    disabled={index === tray.length - 1}
                    aria-label={`Move ${item.name} later`}
                    onClick={() => moveTrayItem(index, 1)}
                  >
                    &darr;
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name} from tray`}
                    onClick={() => removeFromTray(item.trayId)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <label className={classes.densityControl}>
            <span>Spacing</span>
            <select
              value={density}
              onChange={(event) =>
                setDensity(event.target.value as PlacementDensity)
              }
              data-testid="chemical-spacing-select"
            >
              <option value="compact">Compact</option>
              <option value="standard">Standard</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </label>

          <section className={classes.canvasTools}>
            <strong>Selected canvas participants</strong>
            <div>
              <button
                type="button"
                className={classes.secondaryButton}
                onClick={() => dispatch(arrangeSelectedParticipants(density))}
                data-testid="arrange-selected-participants"
              >
                Arrange row
              </button>
              <button
                type="button"
                className={classes.secondaryButton}
                onClick={() => dispatch(duplicateSelectedAsNextStep(density))}
                data-testid="duplicate-next-step"
              >
                Duplicate next step
              </button>
            </div>
            <small>
              Only selected molecules move; everything else stays locked.
            </small>
          </section>

          <section className={classes.savedSets}>
            <strong>Reusable sets</strong>
            <div className={classes.saveSetRow}>
              <input
                value={setName}
                onChange={(event) => setSetName(event.target.value)}
                placeholder="Set name"
                aria-label="Reusable set name"
              />
              <button
                type="button"
                className={classes.secondaryButton}
                disabled={!setName.trim() || !tray.length}
                onClick={saveCurrentSet}
              >
                Save
              </button>
            </div>
            {savedSets.length > 0 && (
              <div className={classes.loadSetRow}>
                <select
                  aria-label="Saved mechanism set"
                  value={selectedSetId}
                  onChange={(event) => setSelectedSetId(event.target.value)}
                >
                  <option value="">Choose a set</option>
                  {savedSets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name} ({set.participants.length})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={classes.textButton}
                  disabled={!selectedSetId}
                  onClick={loadSelectedSet}
                >
                  Load
                </button>
                <button
                  type="button"
                  className={classes.textButton}
                  disabled={!selectedSetId}
                  onClick={deleteSelectedSet}
                >
                  Delete
                </button>
              </div>
            )}
          </section>

          <div className={classes.trayFooter}>
            <button
              type="button"
              className={classes.secondaryButton}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className={classes.primaryButton}
              disabled={!tray.length}
              onClick={() => placeAutomatically(tray)}
              data-testid="place-chemical-tray"
            >
              Place all automatically
            </button>
          </div>
        </aside>
      </div>
    </Dialog>
  );
}

export default ChemicalComposer;
