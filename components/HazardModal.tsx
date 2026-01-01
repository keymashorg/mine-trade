'use client';

import { getHazardIcon } from '@/lib/game/icons';
import { getHazardChoices, type HazardType } from '@/lib/game/depthTrack';
import ResourceIcon from './ResourceIcon';
import * as Dialog from '@radix-ui/react-dialog';

interface HazardModalProps {
  hazard: HazardType;
  open: boolean;
  onChoice1: () => void;
  onChoice2: () => void;
}

export default function HazardModal({ hazard, open, onChoice1, onChoice2 }: HazardModalProps) {
  const choices = getHazardChoices(hazard);
  const iconName = getHazardIcon(hazard);

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border-2 border-red-600 rounded-lg p-8 z-50 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="mb-4">
              <ResourceIcon iconName={iconName} alt={hazard} size={64} />
            </div>
            <Dialog.Title className="text-3xl font-bold text-red-400 mb-2">
              HAZARD!
            </Dialog.Title>
            <Dialog.Description className="text-gray-300 capitalize">
              {hazard.replace('_', ' ')}
            </Dialog.Description>
          </div>

          <div className="space-y-4">
            <button
              onClick={onChoice1}
              className="w-full p-4 bg-red-800 hover:bg-red-700 border-2 border-red-600 rounded-lg text-left transition"
            >
              <div className="font-bold text-lg mb-1">{choices.option1.label}</div>
              <div className="text-sm text-gray-300">{choices.option1.consequence}</div>
            </button>

            <button
              onClick={onChoice2}
              className="w-full p-4 bg-orange-800 hover:bg-orange-700 border-2 border-orange-600 rounded-lg text-left transition"
            >
              <div className="font-bold text-lg mb-1">{choices.option2.label}</div>
              <div className="text-sm text-gray-300">{choices.option2.consequence}</div>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

