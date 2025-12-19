'use client'

import { cn } from '@/lib/utils'

interface LogoLoadingProps {
  size?: number
  className?: string
}

export function LogoLoading({ size = 80, className }: LogoLoadingProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 1596 1596"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="logo-loading overflow-hidden"
      >
        <defs>
          {/* Máscara para manter tudo dentro do retângulo arredondado */}
          <clipPath id="logoMask">
            <rect
              width="1595.49"
              height="1595.49"
              rx="195"
            />
          </clipPath>
        </defs>

        <g clipPath="url(#logoMask)">
          {/* Camada 1: Fundo transparente com borda verde */}
          <rect
            x="5"
            y="5"
            width="1585.49"
            height="1585.49"
            rx="190"
            stroke="#3ECF8E"
            strokeWidth="10"
            fill="transparent"
          />

          {/* Camada 2: Água com ondas */}
          <g className="water-container">
            {/* Onda de trás (mais escura) */}
            <path
              className="wave wave-back"
              fill="#2eb87a"
              d="M0,1596 L0,800
                 Q200,750 400,800
                 T800,800
                 T1200,800
                 T1600,800
                 T2000,800
                 T2400,800
                 L2400,1596 Z"
            />
            {/* Onda da frente (cor principal) */}
            <path
              className="wave wave-front"
              fill="#3ECF8E"
              d="M0,1596 L0,850
                 Q200,800 400,850
                 T800,850
                 T1200,850
                 T1600,850
                 T2000,850
                 T2400,850
                 L2400,1596 Z"
            />
          </g>

          {/* Camada 3: Elementos pretos centrais (sempre no topo) */}
          <path
            d="M435.922 692.921V978.925C434.644 1035.77 450.487 1038.32 496.698 1011.1L796.824 796.386L796.109 597.288C797.109 544.586 785.392 538.025 743.377 566.006L560.155 696.496C545.15 709.973 536.728 709.37 521.723 696.496L473.46 665.214C442.715 649.573 434.364 655.301 435.922 692.921Z"
            fill="#1F1F1F"
          />
          <path
            d="M1157.07 902.572V616.568C1158.35 559.725 1142.5 557.17 1096.29 584.393L798.612 796.386L796.882 998.205C795.882 1050.91 807.598 1057.47 849.614 1029.49L1032.84 898.997C1047.84 885.52 1056.26 886.123 1071.27 898.997L1119.53 930.279C1150.28 945.92 1158.63 940.192 1157.07 902.572Z"
            fill="#1F1F1F"
          />
        </g>

        <style>
          {`
            @keyframes rise {
              0% {
                transform: translateY(900px);
              }
              100% {
                transform: translateY(-100px);
              }
            }

            @keyframes wave-motion {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-800px);
              }
            }

            .water-container {
              animation: rise 2s ease-in-out infinite;
            }

            .wave {
              animation: wave-motion 2s linear infinite;
            }

            .wave-back {
              animation: wave-motion 2.5s linear infinite;
              opacity: 0.7;
            }

            .wave-front {
              animation: wave-motion 1.8s linear infinite reverse;
            }
          `}
        </style>
      </svg>
    </div>
  )
}

export function LogoLoadingFullScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <LogoLoading size={100} />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    </div>
  )
}
