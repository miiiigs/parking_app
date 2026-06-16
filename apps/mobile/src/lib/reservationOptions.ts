export type ArrivalWindowOption = {
  label: string;
  minutes: number;
  fee: number;
  description: string;
};

export const ARRIVAL_WINDOW_OPTIONS: ArrivalWindowOption[] = [
  {
    label: 'Within 30 mins',
    minutes: 30,
    fee: 25,
    description: 'Lowest reservation fee for the shortest arrival window.',
  },
  {
    label: 'Within 1 hour',
    minutes: 60,
    fee: 40,
    description: 'Balanced fee for most urban parking trips.',
  },
  {
    label: 'Within 2 hours',
    minutes: 120,
    fee: 60,
    description: 'Higher fee for a longer arrival buffer.',
  },
];

export const DEFAULT_ARRIVAL_WINDOW_MINUTES = ARRIVAL_WINDOW_OPTIONS[1].minutes;

export function getArrivalWindowOption(minutes: number) {
  return ARRIVAL_WINDOW_OPTIONS.find((option) => option.minutes === minutes) ?? ARRIVAL_WINDOW_OPTIONS[1];
}
