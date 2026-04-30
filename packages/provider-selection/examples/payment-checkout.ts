import { resolveItemProviderSelection } from '@lorion-org/provider-selection';

type PaymentProviderDescriptor = {
  id: string;
  providesFor?: string;
};

const descriptors: PaymentProviderDescriptor[] = [
  {
    id: 'payment-provider-stripe',
    providesFor: 'payment-checkout',
  },
  {
    id: 'payment-provider-invoice',
    providesFor: 'payment-checkout',
  },
];

const result = resolveItemProviderSelection({
  items: descriptors,
  getCapabilityId: (descriptor) => descriptor.providesFor,
  getProviderId: (descriptor) => descriptor.id,
  configuredProviders: {
    'payment-checkout': 'payment-provider-stripe',
  },
});

console.log(result.providersByCapability);
// Map { 'payment-checkout' => ['payment-provider-invoice', 'payment-provider-stripe'] }

console.log(result.selections);
// Map { 'payment-checkout' => { selectedProviderId: 'payment-provider-stripe', mode: 'configured', ... } }

console.log(result.mismatches);
// []

console.log(result.excludedProviderIds);
// ['payment-provider-invoice']
