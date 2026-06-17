'use client'

import Link from 'next/link'
import {
  Mail,
  Phone,
  Building2,
  ChevronRight,
  Briefcase,
  User,
  Calendar,
} from 'lucide-react'

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  company: string
  role: string
  avatar: string | null
  status: string
  lastContact: string
  deals: number
  totalValue: number
  tags: string[]
}

interface ContactCardProps {
  contact: Contact
}

export default function ContactCard({ contact }: ContactCardProps) {
  return (
    <Link
      href={`/contacts/${contact.id}`}
      className="block bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-crm-200 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-crm-100 flex items-center justify-center">
            <User className="w-6 h-6 text-crm-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{contact.name}</h3>
            <p className="text-sm text-gray-500">{contact.role}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            contact.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {contact.status}
        </span>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span>{contact.company}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="truncate">{contact.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="w-4 h-4 text-gray-400" />
          <span>{contact.phone}</span>
        </div>
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {contact.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-crm-50 text-crm-700 text-xs font-medium rounded-full"
            >
              {tag}
            </span>
          ))}
          {contact.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{contact.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Briefcase className="w-4 h-4" />
          <span>{contact.deals} deals</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">
            ${contact.totalValue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Total value</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar className="w-3 h-3" />
          Last: {contact.lastContact}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </Link>
  )
}
