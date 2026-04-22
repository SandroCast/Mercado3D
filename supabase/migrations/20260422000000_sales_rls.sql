-- Allow sellers to read orders that contain their products
-- items is a JSONB array of OrderItem, each with a "sellerId" field (added from this migration forward)

create policy "seller_can_read_sales" on public.orders
  for select using (
    auth.uid() = user_id
    or exists (
      select 1
      from jsonb_array_elements(items) as item
      where (item->>'sellerId') = auth.uid()::text
    )
  );

-- Allow sellers to update status of orders that are their sales
create policy "seller_can_update_status" on public.orders
  for update using (
    exists (
      select 1
      from jsonb_array_elements(items) as item
      where (item->>'sellerId') = auth.uid()::text
    )
  );
