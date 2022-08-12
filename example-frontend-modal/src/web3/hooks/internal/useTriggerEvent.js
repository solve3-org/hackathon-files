import { useReadState, useWriteState } from "..";

const useTriggerEvent = () => {
  const write = useWriteState('TOGGLE_EVENT');
  const event = useReadState('event');

  const trigger = () => {
   write(null);
  }
  return ({
    event,
    trigger
  });
}

export default useTriggerEvent;