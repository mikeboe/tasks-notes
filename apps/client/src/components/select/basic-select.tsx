type SimpleSelectProps = {
  id?: string;
  onChange: (e: any) => void | undefined | null | Promise<void>;
  name?: string;
  value?: string;
  defaultValue?: string;
  items: { name: string; value: string; type?: string; disabled?: boolean }[];
  disabled?: boolean;
  classes?: string;
  typeNames?: Record<string, string>;
};

export const BasicSelect = ({
  id,
  onChange,
  name,
  value,
  defaultValue,
  items,
  disabled,
  classes,
  typeNames,
}: SimpleSelectProps) => {
  // Group items by type
  const groupedItems = items.reduce((acc, item) => {
    const group = item.type || "default";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, { name: string; value: string; type?: string; disabled?: boolean }[]>);

  return (
    <select
      id={id}
      onChange={onChange}
      name={name}
      className={`block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 dark:text-white dark:bg-gray-950 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm sm:leading-6 ${classes}`}
      defaultValue={defaultValue}
      value={value}
      disabled={disabled}
    >
      {Object.entries(groupedItems).map(([group, items]) =>
        group === "default" ? (
          items.map((item) => (
            <option
              key={item.value}
              value={item.value}
              disabled={item.disabled}
            >
              {item.name}
            </option>
          ))
        ) : (
          <optgroup key={group} label={typeNames?.[group] || group}>
            {items.map((item) => (
              <option
                key={item.value}
                value={item.value}
                disabled={item.disabled}
              >
                {item.name}
              </option>
            ))}
          </optgroup>
        )
      )}
    </select>
  );
};
