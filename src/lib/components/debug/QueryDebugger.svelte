<script lang="ts">
import { browser } from '$app/environment';
import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { onMount } from 'svelte';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '$lib/components/ui/collapsible';
import { ScrollArea } from '$lib/components/ui/scroll-area';
import { ChevronDown, RefreshCw, Bug, Server, Database, Eye } from 'lucide-svelte';

// Props
let { 
  queryKeys = [], 
  telefuncEndpoint = '/api/telefunc',
  showBrowserInfo = true,
  showQueryState = true,
  showTelefuncTest = true,
  showDatabaseTest = true
} = $props();

// State
let debugLogs = $state([]);
let isCollapsed = $state(false);
let telefuncTestResult = $state(null);
let databaseTestResult = $state(null);

// Get query client for inspection
const queryClient = useQueryClient();

// Browser environment verification
const browserInfo = $derived(() => ({
  browser_constant: browser,
  window_available: typeof window !== 'undefined',
  navigator_available: typeof navigator !== 'undefined',
  location_href: typeof window !== 'undefined' ? window.location.href : 'N/A',
  user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
  is_hydrated: typeof window !== 'undefined' && window.document?.readyState === 'complete'
}));

// Query state monitoring using $inspect (Svelte 5 rune)
$inspect(queryClient.getQueryCache().getAll()).with((queries) => {
  const timestamp = new Date().toISOString();
  const relevantQueries = queryKeys.length > 0 
    ? queries.filter(query => queryKeys.some(key => JSON.stringify(query.queryKey).includes(key)))
    : queries;
    
  addDebugLog({
    timestamp,
    type: 'QUERY_STATE_CHANGE',
    data: {
      total_queries: queries.length,
      relevant_queries: relevantQueries.length,
      queries: relevantQueries.map(query => ({
        key: query.queryKey,
        state: query.state.status,
        fetchStatus: query.state.fetchStatus,
        dataUpdatedAt: query.state.dataUpdatedAt,
        errorUpdatedAt: query.state.errorUpdatedAt,
        hasData: !!query.state.data,
        dataLength: Array.isArray(query.state.data) ? query.state.data.length : 
                   (query.state.data?.products?.length || 'N/A'),
        error: query.state.error?.message || null
      }))
    }
  });
});

// Telefunc endpoint test query
const telefuncTestQuery = createQuery({
  queryKey: ['debug', 'telefunc-test'],
  queryFn: async () => {
    console.log('🧪 [QueryDebugger] Testing telefunc endpoint reachability...');
    
    try {
      // Test basic telefunc endpoint connectivity
      const response = await fetch(telefuncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telefuncName: 'onGetProducts',
          telefuncArgs: [{ limit: 1 }]
        })
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        timestamp: new Date().toISOString()
      };

      addDebugLog({
        timestamp: result.timestamp,
        type: 'TELEFUNC_TEST',
        data: result
      });

      return result;
    } catch (error) {
      const result = {
        success: false,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack
        },
        timestamp: new Date().toISOString()
      };

      addDebugLog({
        timestamp: result.timestamp,
        type: 'TELEFUNC_ERROR',
        data: result
      });

      throw error;
    }
  },
  enabled: browser && showTelefuncTest,
  retry: false,
  staleTime: 0,
  gcTime: 1000 * 60 * 5 // 5 minutes
});

// Database connectivity test via products endpoint
const databaseTestQuery = createQuery({
  queryKey: ['debug', 'database-test'],
  queryFn: async () => {
    console.log('🧪 [QueryDebugger] Testing database connectivity via products...');
    
    try {
      const { onGetProducts } = await import('$lib/server/telefuncs/product.telefunc');
      const result = await onGetProducts({ limit: 1 });
      
      const testResult = {
        success: true,
        hasProducts: !!result.products,
        productCount: result.products?.length || 0,
        totalCount: result.total_count || 0,
        firstProduct: result.products?.[0] || null,
        timestamp: new Date().toISOString()
      };

      addDebugLog({
        timestamp: testResult.timestamp,
        type: 'DATABASE_TEST',
        data: testResult
      });

      return testResult;
    } catch (error) {
      const result = {
        success: false,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack
        },
        timestamp: new Date().toISOString()
      };

      addDebugLog({
        timestamp: result.timestamp,
        type: 'DATABASE_ERROR',
        data: result
      });

      throw error;
    }
  },
  enabled: browser && showDatabaseTest,
  retry: false,
  staleTime: 0,
  gcTime: 1000 * 60 * 5 // 5 minutes
});

// Helper function to add debug logs
function addDebugLog(logEntry) {
  debugLogs = [logEntry, ...debugLogs.slice(0, 49)]; // Keep last 50 logs
  console.log(`🐛 [QueryDebugger] ${logEntry.type}:`, logEntry.data);
}

// Manual test functions
function runTelefuncTest() {
  telefuncTestQuery.refetch();
}

function runDatabaseTest() {
  databaseTestQuery.refetch();
}

function clearLogs() {
  debugLogs = [];
}

// Update reactive state when queries complete
$effect(() => {
  if (telefuncTestQuery.isSuccess) {
    telefuncTestResult = telefuncTestQuery.data;
  } else if (telefuncTestQuery.isError) {
    telefuncTestResult = { error: telefuncTestQuery.error?.message };
  }
});

$effect(() => {
  if (databaseTestQuery.isSuccess) {
    databaseTestResult = databaseTestQuery.data;
  } else if (databaseTestQuery.isError) {
    databaseTestResult = { error: databaseTestQuery.error?.message };
  }
});

// Log browser info on mount
onMount(() => {
  addDebugLog({
    timestamp: new Date().toISOString(),
    type: 'BROWSER_INFO',
    data: browserInfo()
  });
});
</script>

<Card class="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <Collapsible bind:open={isCollapsed}>
    <CollapsibleTrigger asChild let:builder>
      <button class="w-full" use:builder.action {...builder}>
        <CardHeader class="pb-2">
          <CardTitle class="flex items-center gap-2 text-sm">
            <Bug class="h-4 w-4" />
            Query Debugger
            <Badge variant="outline" class="ml-auto">
              {debugLogs.length} logs
            </Badge>
            <ChevronDown class="h-4 w-4 transition-transform duration-200 {isCollapsed ? 'rotate-180' : ''}" />
          </CardTitle>
        </CardHeader>
      </button>
    </CollapsibleTrigger>
    
    <CollapsibleContent>
      <CardContent class="space-y-4">
        <!-- Browser Environment Info -->
        {#if showBrowserInfo}
          <div class="space-y-2">
            <h4 class="text-sm font-medium flex items-center gap-2">
              <Eye class="h-3 w-3" />
              Browser Environment
            </h4>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>Browser Const: <Badge variant={browserInfo().browser_constant ? 'default' : 'destructive'}>{browserInfo().browser_constant}</Badge></div>
              <div>Window: <Badge variant={browserInfo().window_available ? 'default' : 'destructive'}>{browserInfo().window_available}</Badge></div>
              <div>Navigator: <Badge variant={browserInfo().navigator_available ? 'default' : 'destructive'}>{browserInfo().navigator_available}</Badge></div>
              <div>Hydrated: <Badge variant={browserInfo().is_hydrated ? 'default' : 'destructive'}>{browserInfo().is_hydrated}</Badge></div>
            </div>
          </div>
        {/if}

        <!-- Telefunc Test -->
        {#if showTelefuncTest}
          <div class="space-y-2">
            <h4 class="text-sm font-medium flex items-center gap-2">
              <Server class="h-3 w-3" />
              Telefunc Endpoint Test
              <Button 
                size="sm" 
                variant="outline" 
                class="ml-auto h-6 px-2 text-xs"
                onclick={runTelefuncTest}
                disabled={telefuncTestQuery.isFetching}
              >
                {#if telefuncTestQuery.isFetching}
                  <RefreshCw class="h-3 w-3 animate-spin" />
                {:else}
                  Test
                {/if}
              </Button>
            </h4>
            <div class="text-xs">
              Status: 
              {#if telefuncTestQuery.isFetching}
                <Badge variant="outline">Testing...</Badge>
              {:else if telefuncTestResult?.success}
                <Badge variant="default">✓ Reachable</Badge>
              {:else if telefuncTestResult?.error}
                <Badge variant="destructive">✗ Error</Badge>
              {:else}
                <Badge variant="secondary">Not tested</Badge>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Database Test -->
        {#if showDatabaseTest}
          <div class="space-y-2">
            <h4 class="text-sm font-medium flex items-center gap-2">
              <Database class="h-3 w-3" />
              Database Test
              <Button 
                size="sm" 
                variant="outline" 
                class="ml-auto h-6 px-2 text-xs"
                onclick={runDatabaseTest}
                disabled={databaseTestQuery.isFetching}
              >
                {#if databaseTestQuery.isFetching}
                  <RefreshCw class="h-3 w-3 animate-spin" />
                {:else}
                  Test
                {/if}
              </Button>
            </h4>
            <div class="text-xs">
              Status: 
              {#if databaseTestQuery.isFetching}
                <Badge variant="outline">Testing...</Badge>
              {:else if databaseTestResult?.success}
                <Badge variant="default">✓ Connected ({databaseTestResult?.productCount} products)</Badge>
              {:else if databaseTestResult?.error}
                <Badge variant="destructive">✗ Error</Badge>
              {:else}
                <Badge variant="secondary">Not tested</Badge>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Query State -->
        {#if showQueryState}
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium">Query Logs</h4>
              <Button 
                size="sm" 
                variant="outline" 
                class="h-6 px-2 text-xs"
                onclick={clearLogs}
              >
                Clear
              </Button>
            </div>
            <ScrollArea class="h-40 w-full rounded border">
              <div class="p-2 space-y-1">
                {#each debugLogs as log (log.timestamp)}
                  <div class="text-xs border-l-2 border-muted pl-2" class:border-green-500={log.type.includes('SUCCESS')} class:border-red-500={log.type.includes('ERROR')} class:border-blue-500={log.type.includes('TEST')} class:border-yellow-500={log.type.includes('CHANGE')}>
                    <div class="font-mono text-[10px] text-muted-foreground">{log.timestamp.split('T')[1]?.split('.')[0]}</div>
                    <div class="font-medium">{log.type}</div>
                    {#if log.data.queries}
                      <div class="mt-1">
                        {#each log.data.queries as query}
                          <div class="ml-2 text-[10px]">
                            <div>Key: {JSON.stringify(query.key)}</div>
                            <div>State: <Badge variant={query.state === 'success' ? 'default' : query.state === 'error' ? 'destructive' : 'outline'}>{query.state}</Badge></div>
                            <div>Data: {query.hasData ? `✓ (${query.dataLength})` : '✗'}</div>
                            {#if query.error}
                              <div class="text-red-500">Error: {query.error}</div>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    {:else if log.data.error}
                      <div class="text-red-500 text-[10px] mt-1">{log.data.error.message}</div>
                    {:else if log.data.success !== undefined}
                      <div class="text-[10px] mt-1">
                        Success: {log.data.success ? '✓' : '✗'}
                        {#if log.data.productCount !== undefined}
                          | Products: {log.data.productCount}
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/each}
                
                {#if debugLogs.length === 0}
                  <div class="text-xs text-muted-foreground text-center py-4">
                    No logs yet. Interact with queries to see debug information.
                  </div>
                {/if}
              </div>
            </ScrollArea>
          </div>
        {/if}
      </CardContent>
    </CollapsibleContent>
  </Collapsible>
</Card>
