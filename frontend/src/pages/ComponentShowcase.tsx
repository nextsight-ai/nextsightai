import React from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  StatusBadge,
  Input,
  Textarea,
} from '../components/common';

/**
 * Component Showcase - Demo page for NextSight v2.0 design system
 * This page displays all the new base components
 */
export const ComponentShowcase: React.FC = () => {
  const [inputValue, setInputValue] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          NextSight v2.0 Design System
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Component showcase for the new UI modernization
        </p>
      </div>

      {/* Buttons Section */}
      <Card>
        <CardHeader bordered>
          <h2 className="text-2xl font-semibold">Buttons</h2>
          <p className="text-sm text-gray-600 mt-1">Various button variants and sizes</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Variants */}
          <div>
            <h3 className="text-lg font-medium mb-3">Variants</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <h3 className="text-lg font-medium mb-3">Sizes</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>

          {/* States */}
          <div>
            <h3 className="text-lg font-medium mb-3">States</h3>
            <div className="flex flex-wrap gap-3">
              <Button loading={loading} onClick={handleLoadingDemo}>
                {loading ? 'Loading...' : 'Click to Load'}
              </Button>
              <Button disabled>Disabled</Button>
              <Button fullWidth>Full Width Button</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Cards Section */}
      <Card>
        <CardHeader bordered>
          <h2 className="text-2xl font-semibold">Cards</h2>
          <p className="text-sm text-gray-600 mt-1">Container components with headers and footers</p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card shadow="sm">
              <CardHeader>
                <h3 className="font-medium">Simple Card</h3>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-600">
                  Basic card with small shadow
                </p>
              </CardBody>
            </Card>

            <Card shadow="md" hoverable>
              <CardHeader bordered>
                <h3 className="font-medium">Hoverable Card</h3>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-600">
                  Hover over me!
                </p>
              </CardBody>
            </Card>

            <Card shadow="lg">
              <CardHeader bordered>
                <h3 className="font-medium">Card with Footer</h3>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-600">
                  Card with all sections
                </p>
              </CardBody>
              <CardFooter bordered>
                <Button size="sm" variant="outline">Action</Button>
              </CardFooter>
            </Card>
          </div>
        </CardBody>
      </Card>

      {/* Badges Section */}
      <Card>
        <CardHeader bordered>
          <h2 className="text-2xl font-semibold">Badges</h2>
          <p className="text-sm text-gray-600 mt-1">Status indicators and labels</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Variants */}
          <div>
            <h3 className="text-lg font-medium mb-3">Variants</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="default">Default</Badge>
            </div>
          </div>

          {/* With Dots */}
          <div>
            <h3 className="text-lg font-medium mb-3">With Status Dots</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success" dot>Active</Badge>
              <Badge variant="warning" dot>Pending</Badge>
              <Badge variant="error" dot>Failed</Badge>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <h3 className="text-lg font-medium mb-3">Sizes</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" size="sm">Small</Badge>
              <Badge variant="primary" size="md">Medium</Badge>
              <Badge variant="primary" size="lg">Large</Badge>
            </div>
          </div>

          {/* Kubernetes Status Badges */}
          <div>
            <h3 className="text-lg font-medium mb-3">Kubernetes Status Badges</h3>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="Running" />
              <StatusBadge status="Pending" />
              <StatusBadge status="Failed" />
              <StatusBadge status="Succeeded" />
              <StatusBadge status="Unknown" />
              <StatusBadge status="Terminating" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Inputs Section */}
      <Card>
        <CardHeader bordered>
          <h2 className="text-2xl font-semibold">Inputs</h2>
          <p className="text-sm text-gray-600 mt-1">Form input components</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Basic Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              helperText="We'll never share your email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              required
            />
          </div>

          {/* Input with Icons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Search"
              placeholder="Search resources..."
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <Input
              label="Amount"
              type="number"
              placeholder="0.00"
              rightIcon={<span className="text-gray-500">USD</span>}
            />
          </div>

          {/* Input States */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Disabled Input"
              placeholder="Cannot edit"
              disabled
              value="Disabled value"
            />
            <Input
              label="Error State"
              placeholder="Enter value"
              error="This field is required"
              isError
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>

          {/* Sizes */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Sizes</h3>
            <Input size="sm" placeholder="Small input" />
            <Input size="md" placeholder="Medium input (default)" />
            <Input size="lg" placeholder="Large input" />
          </div>

          {/* Textarea */}
          <Textarea
            label="Description"
            placeholder="Enter a detailed description..."
            helperText="Markdown supported"
            rows={4}
          />

          <Textarea
            label="Notes"
            placeholder="Additional notes"
            error="Please provide more details"
            isError
          />
        </CardBody>
      </Card>

      {/* Color Palette */}
      <Card>
        <CardHeader bordered>
          <h2 className="text-2xl font-semibold">Color Palette</h2>
          <p className="text-sm text-gray-600 mt-1">Design system colors</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Primary Colors */}
          <div>
            <h3 className="text-lg font-medium mb-3">Primary Blue</h3>
            <div className="flex gap-2">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                <div
                  key={shade}
                  className={`w-16 h-16 rounded-lg bg-primary-${shade} border border-gray-200 flex items-center justify-center`}
                >
                  <span className={`text-xs font-medium ${shade >= 500 ? 'text-white' : 'text-gray-900'}`}>
                    {shade}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Semantic Colors */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Success</h4>
              <div className="h-16 bg-success-500 rounded-lg flex items-center justify-center text-white font-medium">
                Success
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Warning</h4>
              <div className="h-16 bg-warning-500 rounded-lg flex items-center justify-center text-white font-medium">
                Warning
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Error</h4>
              <div className="h-16 bg-error-500 rounded-lg flex items-center justify-center text-white font-medium">
                Error
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Info</h4>
              <div className="h-16 bg-info rounded-lg flex items-center justify-center text-white font-medium">
                Info
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader bordered>
          <h2 className="text-2xl font-semibold">Typography</h2>
          <p className="text-sm text-gray-600 mt-1">Text styles and hierarchy</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Heading 1 - 4xl Bold</h1>
          <h2 className="text-3xl font-semibold tracking-tight">Heading 2 - 3xl Semibold</h2>
          <h3 className="text-2xl font-semibold">Heading 3 - 2xl Semibold</h3>
          <h4 className="text-xl font-medium">Heading 4 - xl Medium</h4>
          <h5 className="text-lg font-medium">Heading 5 - lg Medium</h5>
          <p className="text-base">Body text - Base size with normal weight</p>
          <p className="text-sm text-gray-600">Caption - Small text with gray color</p>
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-700">
            Overline - Uppercase Small Text
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

export default ComponentShowcase;
