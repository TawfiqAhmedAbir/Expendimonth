import {
  Car,
  Droplets,
  Fuel,
  Hammer,
  Home,
  Leaf,
  Receipt,
  ShoppingBag,
  Tag,
  Users,
  Wallet,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryIcon as IconName } from '../domain/categories'

const MAP: Record<IconName, LucideIcon> = {
  wallet: Wallet,
  home: Home,
  zap: Zap,
  droplets: Droplets,
  wrench: Wrench,
  car: Car,
  fuel: Fuel,
  'shopping-bag': ShoppingBag,
  users: Users,
  receipt: Receipt,
  hammer: Hammer,
  leaf: Leaf,
}

export function CategoryIcon({ name, size = 18 }: { name: string | null | undefined; size?: number }) {
  const Icon = (name && MAP[name as IconName]) || Tag
  return <Icon size={size} aria-hidden />
}
