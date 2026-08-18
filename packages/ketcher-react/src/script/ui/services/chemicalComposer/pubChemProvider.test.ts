import {
  createDirectNotationCandidate,
  looksLikeStructureNotation,
  searchPubChemByName,
} from './pubChemProvider';

describe('PubChem chemical provider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('maps a PubChem property response to an insertable candidate', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        PropertyTable: {
          Properties: [
            {
              CID: 8471,
              Title: 'Triethylamine',
              MolecularFormula: 'C6H15N',
              Charge: 0,
              SMILES: 'CCN(CC)CC',
            },
          ],
        },
      }),
    });

    const results = await searchPubChemByName('triethylamine');

    expect(results).toEqual([
      expect.objectContaining({
        id: 'pubchem-8471',
        name: 'Triethylamine',
        formula: 'C6H15N',
        structure: 'CCN(CC)CC',
        source: 'pubchem',
      }),
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/name/triethylamine/property/'),
      { signal: undefined },
    );
  });

  it('treats a PubChem not-found response as an empty result', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(searchPubChemByName('not-a-real-compound')).resolves.toEqual(
      [],
    );
  });
});

describe('direct structure notation detection', () => {
  it.each([
    'CCO',
    'c1ccccc1',
    'C1=CC=CC=C1',
    'CC(=O)O',
    '[Na+].[Cl-]',
    '[13CH3][OH]',
    'InChI=1S/CH4/h1H4',
  ])('recognizes %s', (value) => {
    expect(looksLikeStructureNotation(value)).toBe(true);
    expect(createDirectNotationCandidate(value)?.structure).toBe(value);
  });

  it.each([
    'benzene',
    'acetic acid',
    'triethylamine',
    '2-propanol',
    '1,2-dichloroethane',
    '3-methylpentane',
    'CO2',
  ])('keeps the chemical name %s on the lookup path', (value) => {
    expect(looksLikeStructureNotation(value)).toBe(false);
    expect(createDirectNotationCandidate(value)).toBeNull();
  });
});
