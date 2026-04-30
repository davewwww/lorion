import {
  collectProviderPreferences,
  resolveItemProviderSelection,
} from '@lorion-org/provider-selection';

type PlaygroundDescriptor = {
  id: string;
  providerPreferences?: Record<string, string>;
  providesFor?: string;
};

const descriptors: PlaygroundDescriptor[] = [
  {
    id: 'web',
    providerPreferences: {
      'payment-checkout': 'payment-provider-stripe',
    },
  },
  {
    id: 'payment-provider-stripe',
    providesFor: 'payment-checkout',
  },
  {
    id: 'payment-provider-invoice',
    providesFor: 'payment-checkout',
  },
];

const configuredProviders = collectProviderPreferences({
  items: descriptors,
  getProviderPreferences: (descriptor) => descriptor.providerPreferences,
});

const result = resolveItemProviderSelection({
  items: descriptors,
  getCapabilityId: (descriptor) => descriptor.providesFor,
  getProviderId: (descriptor) => descriptor.id,
  configuredProviders,
});

console.log(Object.fromEntries(result.selections));
// { 'payment-checkout': { selectedProviderId: 'payment-provider-stripe', mode: 'configured', ... } }
