'use client'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

interface PaginationControlProps {
  page: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function PaginationControl({
  page,
  total,
  pageSize,
  onPageChange,
}: PaginationControlProps) {
  const totalPages = Math.ceil(total / pageSize)

  const handlePrevious = () => {
    if (page > 1) {
      onPageChange(page - 1)
    }
  }

  const handleNext = () => {
    if (page < totalPages) {
      onPageChange(page + 1)
    }
  }

  const getPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5
    const halfMaxPages = Math.floor(maxPagesToShow / 2)

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      if (page <= halfMaxPages) {
        for (let i = 1; i <= maxPagesToShow - 1; i++) {
          pageNumbers.push(i)
        }
        pageNumbers.push(-1) // ellipsis
        pageNumbers.push(totalPages)
      } else if (page >= totalPages - halfMaxPages) {
        pageNumbers.push(1)
        pageNumbers.push(-1) // ellipsis
        for (let i = totalPages - maxPagesToShow + 2; i <= totalPages; i++) {
          pageNumbers.push(i)
        }
      } else {
        pageNumbers.push(1)
        pageNumbers.push(-1) // ellipsis
        for (let i = page - 1; i <= page + 1; i++) {
          pageNumbers.push(i)
        }
        pageNumbers.push(-1) // ellipsis
        pageNumbers.push(totalPages)
      }
    }
    return pageNumbers
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={handlePrevious}
            className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
          />
        </PaginationItem>
        {getPageNumbers().map((pageNumber, index) => (
          <PaginationItem key={index}>
            {pageNumber === -1 ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                isActive={page === pageNumber}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            onClick={handleNext}
            className={page === totalPages ? 'pointer-events-none opacity-50' : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
