import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					glow: 'hsl(var(--secondary-glow))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))',
					glow: 'hsl(var(--success-glow))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				glass: {
					DEFAULT: 'hsl(var(--glass))',
					border: 'hsl(var(--glass-border))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-glass': 'var(--gradient-glass)',
				'gradient-card': 'var(--gradient-card)'
			},
			boxShadow: {
				'neon': 'var(--shadow-neon)',
				'glow': 'var(--shadow-glow)',
				'glass': 'var(--shadow-glass)',
				'3d': 'var(--shadow-3d)',
				'3d-hover': 'var(--shadow-3d-hover)'
			},
			perspective: {
				'1000': '1000px',
				'1500': '1500px'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in': {
					'0%': {
						transform: 'translateX(-100%)'
					},
					'100%': {
						transform: 'translateX(0)'
					}
				},
				'glow-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 5px hsl(var(--primary) / 0.5)'
					},
					'50%': {
						boxShadow: '0 0 20px hsl(var(--primary) / 0.8)'
					}
				},
				'tilt-in': {
					'0%': {
						transform: 'perspective(1000px) rotateX(5deg) rotateY(5deg) scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
						opacity: '1'
					}
				},
				'slide-in-right': {
					'0%': {
						transform: 'translateX(100%)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateX(0)',
						opacity: '1'
					}
				},
				// Unlock Celebration Animations
				'unlock-common': {
					'0%': { transform: 'scale(0.5)', opacity: '0' },
					'50%': { transform: 'scale(1.1)' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'unlock-uncommon': {
					'0%': { transform: 'scale(0.3)', opacity: '0' },
					'40%': { transform: 'scale(1.2)' },
					'60%': { transform: 'scale(0.95)' },
					'80%': { transform: 'scale(1.05)' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'unlock-rare': {
					'0%': { transform: 'rotate(-180deg) scale(0)', opacity: '0' },
					'50%': { transform: 'rotate(15deg) scale(1.2)' },
					'100%': { transform: 'rotate(0deg) scale(1)', opacity: '1' }
				},
				'unlock-epic': {
					'0%': { transform: 'perspective(1000px) rotateX(90deg) scale(0)', opacity: '0' },
					'30%': { transform: 'perspective(1000px) rotateX(-20deg) scale(1.3)' },
					'60%': { transform: 'perspective(1000px) rotateX(10deg) scale(0.9)' },
					'100%': { transform: 'perspective(1000px) rotateX(0deg) scale(1)', opacity: '1' }
				},
				'unlock-legendary': {
					'0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
					'40%': { transform: 'scale(1.5) rotate(20deg)' },
					'70%': { transform: 'scale(0.9) rotate(-5deg)' },
					'100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' }
				},
				'golden-rays': {
					'0%': { transform: 'rotate(0deg)', opacity: '0.8' },
					'100%': { transform: 'rotate(360deg)', opacity: '0.8' }
				},
				'float-particle': {
					'0%, 100%': { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: '1' },
					'25%': { transform: 'translateY(-15px) translateX(10px) rotate(90deg)', opacity: '0.8' },
					'50%': { transform: 'translateY(-20px) translateX(-5px) rotate(180deg)', opacity: '0.6' },
					'75%': { transform: 'translateY(-10px) translateX(-10px) rotate(270deg)', opacity: '0.9' }
				},
				// Battle Animations
				'damage-shake': {
					'0%, 100%': { transform: 'translateX(0)' },
					'10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
					'20%, 40%, 60%, 80%': { transform: 'translateX(4px)' }
				},
				'card-fly-in': {
					'0%': { transform: 'translateY(100px) scale(0.5) rotateX(45deg)', opacity: '0' },
					'60%': { transform: 'translateY(-10px) scale(1.1) rotateX(-5deg)', opacity: '1' },
					'100%': { transform: 'translateY(0) scale(1) rotateX(0deg)', opacity: '1' }
				},
				'shine': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(200%)' }
				},
				'gradient-shift': {
					'0%, 100%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0) translateX(0)' },
					'25%': { transform: 'translateY(-30px) translateX(10px)' },
					'50%': { transform: 'translateY(-60px) translateX(-10px)' },
					'75%': { transform: 'translateY(-30px) translateX(10px)' }
				},
				// Card Effect Animations
				'fire-flicker': {
					'0%, 100%': { opacity: '1', transform: 'scale(1)' },
					'25%': { opacity: '0.9', transform: 'scale(1.05)' },
					'50%': { opacity: '0.95', transform: 'scale(0.98)' },
					'75%': { opacity: '0.92', transform: 'scale(1.02)' }
				},
				'shield-pulse': {
					'0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
					'50%': { opacity: '0.6', transform: 'scale(1.05)' }
				},
				'ice-shimmer': {
					'0%': { opacity: '0.2', transform: 'rotate(0deg)' },
					'50%': { opacity: '0.4', transform: 'rotate(180deg)' },
					'100%': { opacity: '0.2', transform: 'rotate(360deg)' }
				},
				'screen-shake-light': {
					'0%, 100%': { transform: 'translate(0, 0)' },
					'10%, 30%, 50%, 70%, 90%': { transform: 'translate(-2px, 1px)' },
					'20%, 40%, 60%, 80%': { transform: 'translate(2px, -1px)' }
				},
				'screen-shake-medium': {
					'0%, 100%': { transform: 'translate(0, 0)' },
					'10%, 30%, 50%, 70%, 90%': { transform: 'translate(-4px, 2px)' },
					'20%, 40%, 60%, 80%': { transform: 'translate(4px, -2px)' }
				},
				'screen-shake-heavy': {
					'0%, 100%': { transform: 'translate(0, 0)' },
					'10%': { transform: 'translate(-8px, 4px)' },
					'20%': { transform: 'translate(8px, -4px)' },
					'30%': { transform: 'translate(-8px, -4px)' },
					'40%': { transform: 'translate(8px, 4px)' },
					'50%': { transform: 'translate(-6px, 3px)' },
					'60%': { transform: 'translate(6px, -3px)' },
					'70%': { transform: 'translate(-4px, 2px)' },
					'80%': { transform: 'translate(4px, -2px)' },
					'90%': { transform: 'translate(-2px, 1px)' }
				},
				'legendary-burst': {
					'0%': { transform: 'scale(0.8)', opacity: '0' },
					'40%': { transform: 'scale(1.3)', opacity: '1' },
					'100%': { transform: 'scale(1)', opacity: '0.8' }
				},
				// Victory/Defeat Modal Animations
				'victory-burst': {
					'0%': { transform: 'scale(0.5) rotate(-180deg)', opacity: '0' },
					'50%': { transform: 'scale(1.2) rotate(10deg)', opacity: '1' },
					'100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' }
				},
				'defeat-fade': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-in': 'slide-in 0.3s ease-out',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'tilt-in': 'tilt-in 0.4s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				// Unlock Celebrations
				'unlock-common': 'unlock-common 0.6s ease-out',
				'unlock-uncommon': 'unlock-uncommon 0.8s ease-out',
				'unlock-rare': 'unlock-rare 1s ease-out',
				'unlock-epic': 'unlock-epic 1.2s ease-out',
				'unlock-legendary': 'unlock-legendary 1.5s ease-out',
				'golden-rays': 'golden-rays 8s linear infinite',
				'float-particle': 'float-particle 3s ease-in-out infinite',
				// Battle Animations
				'damage-shake': 'damage-shake 0.5s ease-in-out',
				'card-fly-in': 'card-fly-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'shine': 'shine 3s ease-in-out infinite',
				'gradient-shift': 'gradient-shift 8s ease infinite',
				'float': 'float 6s ease-in-out infinite',
				// Card Effect Animations
				'fire-flicker': 'fire-flicker 0.3s ease-in-out infinite',
				'shield-pulse': 'shield-pulse 1.5s ease-in-out infinite',
				'ice-shimmer': 'ice-shimmer 4s linear infinite',
				'screen-shake-light': 'screen-shake-light 0.5s ease-in-out',
				'screen-shake-medium': 'screen-shake-medium 0.5s ease-in-out',
				'screen-shake-heavy': 'screen-shake-heavy 0.6s ease-in-out',
				'legendary-burst': 'legendary-burst 1s ease-out',
				// Victory/Defeat Modals
				'victory-burst': 'victory-burst 1s ease-out',
				'defeat-fade': 'defeat-fade 0.6s ease-out'
			},
			spacing: {
				'safe': 'env(safe-area-inset-bottom)'
			}
		}
	},
	plugins: [require("tailwindcss-animate"), require("@tailwindcss/line-clamp")],
} satisfies Config;
