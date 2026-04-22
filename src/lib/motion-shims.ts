import * as MR from 'motion/react';

export const motion: any = (MR as any).motion || MR || {};

export const AnimatePresence: any = (MR as any).AnimatePresence || ((props: any) => props.children);

export default motion;
