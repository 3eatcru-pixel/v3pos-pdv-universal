import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, Scan, X, Monitor, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBarcodeScanner } from '../../../hooks/useBarcodeScanner';
import { cn } from '../../../lib/utils';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Support for Hardware Scanner (Keyboard Emulation)
  useBarcodeScanner((barcode) => {
    onScan(barcode);
  });

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (isCameraActive) {
      // Small timeout to ensure DOM is ready and Animation has rendered the div
      const initTimeout = setTimeout(() => {
        const readerElement = document.getElementById("reader");
        if (!readerElement) {
          console.warn("Scanner element not found yet, retrying...");
          return;
        }

        scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 15, 
            qrbox: { width: 300, height: 180 },
            aspectRatio: 1.777778
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            onScan(decodedText);
            if (!continuousMode) {
               setIsCameraActive(false);
            }
          },
          (error) => {
            // Failure is common while scanning
          }
        );
        
        scannerRef.current = scanner;
      }, 100);

      return () => {
        clearTimeout(initTimeout);
        if (scanner) {
          scanner.clear().catch(err => console.error("Error clearing scanner:", err));
          scannerRef.current = null;
        }
      };
    }
  }, [isCameraActive, onScan, continuousMode]);

  return (
    <div className={cn(
      "relative overflow-hidden transition-all duration-500",
      isCameraActive ? "h-[500px]" : "h-48"
    )}>
      <AnimatePresence mode="wait">
        {!isCameraActive ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full bg-slate-900 rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 border border-white/10 group"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                <Monitor className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Scanner / Webcam</h3>
                <p className="text-slate-400 text-sm font-medium">Use scanner USB, Bluetooth ou a própria <span className="text-emerald-400">Webcam do PC</span>.</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
               <div className="hidden lg:flex flex-col items-end gap-1">
                  <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                     <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                     <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Driver OK</span>
                  </div>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest pr-2">Webcam Suportada</span>
               </div>
               <button 
                onClick={() => setIsCameraActive(true)}
                className="px-10 py-5 bg-white text-slate-900 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 transition-all flex items-center gap-3 shadow-2xl active:scale-95"
               >
                 <Camera className="w-4 h-4" /> Iniciar Webcam
               </button>
            </div>
            
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-600/10 rounded-full blur-[80px] pointer-events-none" />
          </motion.div>
        ) : (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full bg-black rounded-[3rem] p-8 border-4 border-emerald-500/30 flex flex-col relative"
          >
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
                     <span className="text-[11px] font-black text-white uppercase tracking-widest italic">Webcam em Operação</span>
                  </div>
                  
                  <button 
                    onClick={() => setContinuousMode(!continuousMode)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all",
                      continuousMode ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-slate-400"
                    )}
                  >
                    Escaneamento Contínuo: {continuousMode ? 'ON' : 'OFF'}
                  </button>
               </div>

               <button 
                onClick={() => setIsCameraActive(false)}
                className="p-3 bg-white/10 hover:bg-rose-500 transition-all rounded-xl text-white"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>

            <div className="flex-1 bg-slate-800 rounded-2xl overflow-hidden relative border border-white/5">
               <div id="reader" className="w-full h-full [&>div]:!border-none [&_video]:!object-cover [&_select]:!bg-slate-900 [&_select]:!text-white [&_select]:!rounded-lg [&_select]:!p-2 [&_select]:!text-[10px] [&_select]:!mt-2" />
               
               <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-72 h-40 border-2 border-emerald-500 rounded-2xl relative shadow-[0_0_80px_rgba(16,185,129,0.2)]">
                     <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 -ml-1 -mt-1 rounded-tl-xl" />
                     <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 -mr-1 -mt-1 rounded-tr-xl" />
                     <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 -ml-1 -mb-1 rounded-bl-xl" />
                     <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 -mr-1 -mb-1 rounded-br-xl" />
                     
                     <motion.div 
                        animate={{ top: ['5%', '95%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="absolute left-2 right-2 h-0.5 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)]"
                     />
                  </div>
               </div>
            </div>

            <div className="flex items-center justify-between mt-6 px-4">
               <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                 <Scan className="w-3 h-3 text-emerald-500" /> Alinhe o código na moldura
               </p>
               <span className="text-[10px] text-slate-600 font-bold">FPS Ótimo: 15-30</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
