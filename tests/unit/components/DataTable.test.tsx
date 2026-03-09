import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable, { Column } from '../../../src/components/DataTable/DataTable'

interface TestData {
  _id: string
  name: string
  email: string
  status: string
}

describe('DataTable Component', () => {
  const mockData: TestData[] = [
    { _id: '1', name: 'John Doe', email: 'john@test.com', status: 'active' },
    { _id: '2', name: 'Jane Smith', email: 'jane@test.com', status: 'inactive' },
    { _id: '3', name: 'Bob Johnson', email: 'bob@test.com', status: 'active' },
  ]

  const mockColumns: Column<TestData>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status' },
  ]

  describe('Rendering', () => {
    it('should render table with data', () => {
      render(<DataTable data={mockData} columns={mockColumns} />)
      
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@test.com')).toBeInTheDocument()
    })

    it('should render empty message when no data', () => {
      render(<DataTable data={[]} columns={mockColumns} />)
      
      expect(screen.getByText('No hay datos para mostrar')).toBeInTheDocument()
    })

    it('should render custom empty message', () => {
      const customMessage = 'No users found'
      render(<DataTable data={[]} columns={mockColumns} emptyMessage={customMessage} />)
      
      expect(screen.getByText(customMessage)).toBeInTheDocument()
    })

    it('should render all rows', () => {
      render(<DataTable data={mockData} columns={mockColumns} />)
      
      mockData.forEach(item => {
        expect(screen.getByText(item.name)).toBeInTheDocument()
      })
    })
  })

  describe('Custom Rendering', () => {
    it('should use custom render function', () => {
      const columnsWithRender: Column<TestData>[] = [
        { key: 'name', header: 'Name' },
        { 
          key: 'status', 
          header: 'Status',
          render: (item) => <span data-testid="status-badge">{item.status.toUpperCase()}</span>
        },
      ]

      render(<DataTable data={mockData} columns={columnsWithRender} />)
      
      const badges = screen.getAllByTestId('status-badge')
      expect(badges).toHaveLength(3)
      expect(badges[0]).toHaveTextContent('ACTIVE')
    })

    it('should apply custom width to columns', () => {
      const columnsWithWidth: Column<TestData>[] = [
        { key: 'name', header: 'Name', width: '200px' },
        { key: 'email', header: 'Email', width: '300px' },
      ]

      const { container } = render(<DataTable data={mockData} columns={columnsWithWidth} />)
      
      const headers = container.querySelectorAll('th')
      expect(headers[0]).toHaveStyle({ width: '200px' })
      expect(headers[1]).toHaveStyle({ width: '300px' })
    })

    it('should apply custom alignment', () => {
      const columnsWithAlign: Column<TestData>[] = [
        { key: 'name', header: 'Name', align: 'left' },
        { key: 'email', header: 'Email', align: 'center' },
        { key: 'status', header: 'Status', align: 'right' },
      ]

      const { container } = render(<DataTable data={mockData} columns={columnsWithAlign} />)
      
      const headers = container.querySelectorAll('th')
      expect(headers[0]).toHaveStyle({ textAlign: 'left' })
      expect(headers[1]).toHaveStyle({ textAlign: 'center' })
      expect(headers[2]).toHaveStyle({ textAlign: 'right' })
    })
  })

  describe('Row Click', () => {
    it('should call onRowClick when row is clicked', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      
      render(<DataTable data={mockData} columns={mockColumns} onRowClick={onRowClick} />)
      
      const firstRow = screen.getByText('John Doe').closest('tr')
      await user.click(firstRow!)
      
      expect(onRowClick).toHaveBeenCalledWith(mockData[0])
      expect(onRowClick).toHaveBeenCalledTimes(1)
    })

    it('should have pointer cursor when onRowClick is provided', () => {
      const { container } = render(<DataTable data={mockData} columns={mockColumns} onRowClick={vi.fn()} />)
      
      const rows = container.querySelectorAll('tbody tr')
      rows.forEach(row => {
        expect(row).toHaveStyle({ cursor: 'pointer' })
      })
    })

    it('should have default cursor when onRowClick is not provided', () => {
      const { container } = render(<DataTable data={mockData} columns={mockColumns} />)
      
      const rows = container.querySelectorAll('tbody tr')
      rows.forEach(row => {
        expect(row).toHaveStyle({ cursor: 'default' })
      })
    })
  })

  describe('Data without _id', () => {
    it('should render data without _id using index as key', () => {
      const dataWithoutId = [
        { name: 'Test 1', email: 'test1@test.com', status: 'active' },
        { name: 'Test 2', email: 'test2@test.com', status: 'inactive' },
      ]

      render(<DataTable data={dataWithoutId} columns={mockColumns} />)
      
      expect(screen.getByText('Test 1')).toBeInTheDocument()
      expect(screen.getByText('Test 2')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      const { container } = render(<DataTable data={mockData} columns={mockColumns} />)
      
      expect(container.querySelector('table')).toBeInTheDocument()
      expect(container.querySelector('thead')).toBeInTheDocument()
      expect(container.querySelector('tbody')).toBeInTheDocument()
    })

    it('should have proper column headers', () => {
      render(<DataTable data={mockData} columns={mockColumns} />)
      
      mockColumns.forEach(column => {
        expect(screen.getByText(column.header)).toBeInTheDocument()
      })
    })
  })
})
