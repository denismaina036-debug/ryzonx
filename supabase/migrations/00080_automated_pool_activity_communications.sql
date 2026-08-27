-- Automated, editable pool-activity communications.
-- Business mutations commit first; communication dispatch is asynchronous and idempotent.

CREATE UNIQUE INDEX IF NOT EXISTS idx_communications_pool_automation_telegram
  ON communications (template_slug, related_entity_id)
  WHERE related_entity_type = 'automated_pool_activity_telegram';

CREATE UNIQUE INDEX IF NOT EXISTS idx_communications_pool_automation_user
  ON communications (recipient_user_id, template_slug, related_entity_id)
  WHERE related_entity_type = 'automated_pool_activity_user';

INSERT INTO communication_templates (
  slug,
  name,
  category,
  description,
  subject_template,
  body_template,
  in_app_title_template,
  in_app_body_template,
  variables_schema,
  default_channels,
  is_active
)
VALUES
  (
    'pool_activity_new_pool',
    'Automated Pool Activity — New Pool',
    'announcements',
    'Published automatically when an approved pool becomes available in the marketplace.',
    '🚀 New Investment Pool Now Available — {{pool_name}}',
    '<p>A new professionally managed investment opportunity is now available on RyvonX.</p><p><strong>Pool:</strong> {{pool_name}}<br><strong>Pool Manager:</strong> {{manager_name}}<br><strong>Minimum Investment:</strong> {{minimum_investment}}<br><strong>Target Capital:</strong> {{target_capital}}<br><strong>Payout Duration:</strong> {{payout_duration}}</p><p>Review the pool strategy, manager profile, risk information, and investment terms before participating.</p><p>👉 <a href="{{pool_url}}">Explore {{pool_name}}</a> and decide whether it matches your investment goals.</p><p><em>Investing involves risk. Review all pool information before committing capital.</em></p>',
    'New pool available — {{pool_name}}',
    '{{pool_name}} is now available. Minimum investment: {{minimum_investment}}. Target capital: {{target_capital}}.',
    '[{"key":"pool_name","label":"Pool name","required":true},{"key":"manager_name","label":"Manager","required":true},{"key":"minimum_investment","label":"Minimum investment","required":true},{"key":"target_capital","label":"Target capital","required":true},{"key":"payout_duration","label":"Payout duration","required":true},{"key":"pool_url","label":"Pool URL","required":true}]'::jsonb,
    ARRAY['telegram']::communication_channel[],
    true
  ),
  (
    'pool_activity_new_cycle',
    'Automated Pool Activity — New Cycle',
    'announcements',
    'Published automatically when a cycle starts accepting funding.',
    '🔔 New Investment Cycle Open — {{pool_name}}',
    '<p>A new investment cycle is now accepting participants.</p><p><strong>Pool:</strong> {{pool_name}}<br><strong>Manager:</strong> {{manager_name}}<br><strong>Cycle:</strong> {{cycle_name}}<br><strong>Minimum Investment:</strong> {{minimum_investment}}<br><strong>Target Capital:</strong> {{target_capital}}<br><strong>Funding Deadline:</strong> {{funding_deadline}}<br><strong>Expected Payout Duration:</strong> {{payout_duration}}</p><p>Investors can review the opportunity and participate before the funding period closes.</p><p>👉 <a href="{{pool_url}}">View the cycle and participate</a>.</p><p><em>Availability is subject to the cycle funding status and platform requirements.</em></p>',
    'New cycle open — {{pool_name}}',
    '{{cycle_name}} is now accepting participants. Target capital: {{target_capital}}.',
    '[{"key":"pool_name","label":"Pool name","required":true},{"key":"manager_name","label":"Manager","required":true},{"key":"cycle_name","label":"Cycle name","required":true},{"key":"minimum_investment","label":"Minimum investment","required":true},{"key":"target_capital","label":"Target capital","required":true},{"key":"funding_deadline","label":"Funding deadline","required":false},{"key":"payout_duration","label":"Payout duration","required":true},{"key":"pool_url","label":"Pool URL","required":true}]'::jsonb,
    ARRAY['telegram']::communication_channel[],
    true
  ),
  (
    'pool_activity_trading_started',
    'Automated Pool Activity — Trading Started',
    'announcements',
    'Published automatically when a cycle enters trading.',
    '📈 Trading Has Started — {{pool_name}}',
    '<p>{{pool_name}} has officially entered its trading phase.</p><p><strong>Pool Manager:</strong> {{manager_name}}<br><strong>Cycle:</strong> {{cycle_name}}<br><strong>Capital Raised:</strong> {{raised_capital}}<br><strong>Participating Investors:</strong> {{investor_count}}<br><strong>Trading Started:</strong> {{trading_start_date}}</p><p>The manager is now executing the approved trading strategy. Existing investors can monitor verified activity and cycle progress through RyvonX.</p><p>Interested in future opportunities? <a href="{{pool_url}}">Follow {{pool_name}}</a> and watch for its next investment cycle.</p><p><em>Trading involves risk. Live performance may change, and past results do not guarantee future returns.</em></p>',
    'Trading started — {{pool_name}}',
    '{{cycle_name}} has entered trading with {{raised_capital}} in confirmed capital.',
    '[{"key":"pool_name","label":"Pool name","required":true},{"key":"manager_name","label":"Manager","required":true},{"key":"cycle_name","label":"Cycle name","required":true},{"key":"raised_capital","label":"Raised capital","required":true},{"key":"investor_count","label":"Investor count","required":true},{"key":"trading_start_date","label":"Trading start date","required":true},{"key":"pool_url","label":"Pool URL","required":true}]'::jsonb,
    ARRAY['telegram']::communication_channel[],
    true
  ),
  (
    'pool_activity_profit_recorded',
    'Automated Pool Activity — Profit Recorded',
    'announcements',
    'Published for each confirmed positive closed trade.',
    '✅ Profit Recorded — {{pool_name}}',
    '<p>{{pool_name}} has recorded a new realized trading profit.</p><p><strong>Latest Realized Profit:</strong> {{profit_amount}}<br><strong>Cycle Profit to Date:</strong> {{cycle_profit_total}}<br><strong>Cycle:</strong> {{cycle_name}}<br><strong>Pool Manager:</strong> {{manager_name}}</p><p>This update reflects a closed trade recorded in the pool official trading journal.</p><p>Explore the pool verified activity and follow it for upcoming investment opportunities.</p><p>👉 <a href="{{pool_url}}">View the latest pool performance</a>.</p><p><em>This is a performance update, not a promise of future returns. Final investor distributions are calculated only after settlement.</em></p>',
    'Profit recorded — {{pool_name}}',
    '{{pool_name}} recorded {{profit_amount}} in realized profit. Cycle total: {{cycle_profit_total}}.',
    '[{"key":"pool_name","label":"Pool name","required":true},{"key":"manager_name","label":"Manager","required":true},{"key":"cycle_name","label":"Cycle name","required":true},{"key":"profit_amount","label":"Profit amount","required":true},{"key":"cycle_profit_total","label":"Cycle profit total","required":true},{"key":"pool_url","label":"Pool URL","required":true}]'::jsonb,
    ARRAY['telegram']::communication_channel[],
    true
  ),
  (
    'pool_activity_profit_distributed',
    'Automated Pool Activity — Profit Distributed',
    'announcements',
    'Published after a profit settlement is fully completed.',
    '💰 Profits Distributed — {{pool_name}}',
    '<p>{{pool_name}} has successfully completed its profit distribution for {{cycle_name}}.</p><p><strong>Total Profit Distributed to Investors:</strong> {{distributed_profit}}<br><strong>Participating Investors:</strong> {{investor_count}}<br><strong>Cycle Capital:</strong> {{cycle_capital}}<br><strong>Distribution Date:</strong> {{distribution_date}}</p><p>Eligible investor settlements have been calculated and credited according to the confirmed ownership records for the cycle.</p><p>Follow {{pool_name}} to receive updates about its next investment cycle.</p><p>👉 <a href="{{pool_url}}">Explore the pool and upcoming opportunities</a>.</p><p><em>Individual returns depend on confirmed capital participation and the applicable pool agreement.</em></p>',
    'Profits distributed — {{pool_name}}',
    '{{distributed_profit}} has been distributed to eligible investors in {{cycle_name}}.',
    '[{"key":"pool_name","label":"Pool name","required":true},{"key":"cycle_name","label":"Cycle name","required":true},{"key":"distributed_profit","label":"Distributed profit","required":true},{"key":"investor_count","label":"Investor count","required":true},{"key":"cycle_capital","label":"Cycle capital","required":true},{"key":"distribution_date","label":"Distribution date","required":true},{"key":"pool_url","label":"Pool URL","required":true}]'::jsonb,
    ARRAY['telegram']::communication_channel[],
    true
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO automation_rules (
  rule_key,
  name,
  description,
  event_type,
  category,
  status,
  priority,
  conditions,
  actions
)
VALUES
  ('pool_activity_new_pool', 'Publish New Pool', 'Announce a newly approved marketplace pool.', 'pool.published', 'investment', 'active', 10, '{}'::jsonb, '[{"type":"broadcast_template","templateSlug":"pool_activity_new_pool","channels":["telegram"],"audience":"all_active"}]'::jsonb),
  ('pool_activity_new_cycle', 'Publish New Cycle', 'Announce a cycle that has opened for funding.', 'cycle.funding_opened', 'investment', 'active', 10, '{}'::jsonb, '[{"type":"broadcast_template","templateSlug":"pool_activity_new_cycle","channels":["telegram"],"audience":"all_active"}]'::jsonb),
  ('pool_activity_trading_started', 'Publish Trading Start', 'Announce a cycle entering trading with committed capital.', 'cycle.started', 'investment', 'active', 10, '{}'::jsonb, '[{"type":"broadcast_template","templateSlug":"pool_activity_trading_started","channels":["telegram"],"audience":"all_active"}]'::jsonb),
  ('pool_activity_profit_recorded', 'Publish Positive Trade Profit', 'Announce each confirmed positive closed trade.', 'trade.profit_recorded', 'performance', 'active', 20, '{}'::jsonb, '[{"type":"broadcast_template","templateSlug":"pool_activity_profit_recorded","channels":["telegram"],"audience":"all_active"}]'::jsonb),
  ('pool_activity_profit_distributed', 'Publish Profit Distribution', 'Announce a completed investor profit distribution.', 'distribution.completed', 'financial', 'active', 10, '{}'::jsonb, '[{"type":"broadcast_template","templateSlug":"pool_activity_profit_distributed","channels":["telegram"],"audience":"all_active"}]'::jsonb)
ON CONFLICT (rule_key) DO NOTHING;
