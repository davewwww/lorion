import type { CompositionPolicy, RelationDescriptor } from '@lorion-org/composition-graph';

export const defaultCapabilityResolutionRelations = [
  'dependencies',
  'defaultProviders',
  'providerPreferences',
] as const;

export const defaultCapabilityRelationDescriptors: RelationDescriptor[] = [
  {
    direction: 'incoming',
    field: 'defaultFor',
    id: 'defaultProviders',
  },
  {
    field: 'providerPreferences',
    id: 'providerPreferences',
    targetMode: 'values',
  },
];

export function createCapabilityCompositionPolicy(
  policy?: Partial<CompositionPolicy>,
): Partial<CompositionPolicy> {
  return {
    ...policy,
    inspectionRelationIds: policy?.inspectionRelationIds ?? [
      ...defaultCapabilityResolutionRelations,
    ],
    provenanceRelationIds: policy?.provenanceRelationIds ?? [
      ...defaultCapabilityResolutionRelations,
    ],
    resolutionRelationIds: policy?.resolutionRelationIds ?? [
      ...defaultCapabilityResolutionRelations,
    ],
  };
}
