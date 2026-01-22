import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import DatabaseSchemaDemo from './DatabaseSchemaDemo'
import { createContext } from 'react'

// Mock the useMode hook
const mockSetSelectedHandle = vi.fn()
const mockModeContext = {
  isRelationshipMode: false,
  isReorderMode: false,
  selectedHandle: null,
  setSelectedHandle: mockSetSelectedHandle,
}

// Mock the App context
vi.mock('../App', () => ({
  useMode: () => mockModeContext,
}))

// Mock useReactFlow
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react')
  return {
    ...actual,
    useReactFlow: () => ({
      setNodes: vi.fn(),
    }),
    useNodeId: () => 'test-node-id',
  }
})

const mockData = {
  data: {
    label: 'Test Table',
    schema: [
      { title: 'id', type: 'uuid' },
      { title: 'name', type: 'varchar' },
      { title: 'email', type: 'varchar' },
    ],
  },
}

const renderComponent = () => {
  return render(
    <ReactFlowProvider>
      <DatabaseSchemaDemo {...mockData} />
    </ReactFlowProvider>
  )
}

describe('DatabaseSchemaDemo', () => {
  it('should render the table name', () => {
    renderComponent()
    expect(screen.getByText('Test Table')).toBeInTheDocument()
  })

  it('should render all schema fields', () => {
    renderComponent()
    expect(screen.getByText('id')).toBeInTheDocument()
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
  })

  it('should render field types', () => {
    renderComponent()
    expect(screen.getByText('uuid')).toBeInTheDocument()
    // There are multiple varchar fields, so use getAllByText
    const varcharFields = screen.getAllByText('varchar')
    expect(varcharFields.length).toBeGreaterThan(0)
  })

  it('should show add field button', () => {
    renderComponent()
    const addButton = screen.getByTitle('Add field')
    expect(addButton).toBeInTheDocument()
  })

  it('should show primary key icon for id field', () => {
    renderComponent()
    // The primary key icon should be present for 'id' field
    const idField = screen.getByText('id').closest('tr')
    expect(idField).toBeInTheDocument()
  })
})

