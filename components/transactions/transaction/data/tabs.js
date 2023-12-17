import { Tabs, TabsHeader, TabsBody, Tab, TabPanel } from '@material-tailwind/react'

export default (
  {
    value = '',
    title = '',
    formattable = false,
    formats = [],
    onSelect,
    render,
  },
) => {
  return (
    <Tabs value={value} className="tabs">
      <div className="flex flex-col space-y-2">
        <div className="text-slate-600 dark:text-slate-200 text-base lg:text-lg font-semibold">
          {title}
        </div>
        {formattable && (
          <TabsHeader className="max-w-xs">
            {formats.map((f, i) => (
              <Tab
                key={i}
                value={f.id}
                onClick={() => onSelect(f.id)}
              >
                {f.title}
              </Tab>
            ))}
          </TabsHeader>
        )}
      </div>
      <TabsBody>
        {formats.filter(f => f.id === value).map((f, i) => (
          <TabPanel key={i} value={f.id}>
            {render(f.id)}
          </TabPanel>
        ))}
      </TabsBody>
    </Tabs>
  )
}